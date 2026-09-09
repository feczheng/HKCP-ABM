/**
 * WholeHkPopulation.allocate({ regions, population, seed }) -> { profiles, report }
 *
 * regions: [{ id, areas: [{ id, ages: [{ age, populationEstimate }] }] }]
 * IDs must be nonempty, trimmed strings; region IDs and DCCA IDs must be unique.
 * Ages are unique integers 6..16 within each area, with finite positive targets.
 * Each area must supply at least one age in each of 6..8, 9..11 and 12..16.
 * Omitted single ages have zero target. population is a positive safe integer;
 * seed is a required unsigned 32-bit integer (including zero).
 *
 * Regions, then DCCA/age-group strata, receive proportional largest-remainder
 * quotas subject to their minima. Minimum = 3 * area count (1,356 for 452 DCCAs).
 * Within each stratum, one seeded random offset drives systematic age sampling.
 * Input order does not affect results; profiles follow canonical region/DCCA/
 * age-group order. No input is mutated and no ambient/application RNG is used.
 *
 * Each profile's censusWeight represents its entire age-group stratum divided
 * by its Agent count. targetAgePopulation is the supplied DCCA/single-age target,
 * NOT a promise that the sampled single-age weight matches that target.
 * Stage, age-group, DCCA and regional totals match within floating-point precision.
 * Single-age totals are sampled, not exact; report.ageTargets and each stratum's
 * ageTargets contain { age, target, estimated, error, absoluteError, relativeError,
 * agents }. Errors are estimated - target, not confidence intervals. An age's
 * systematic count differs from its fractional quota by at most one Agent.
 *
 * report includes population, minimum, coverage, stratumCount, strata (ledger),
 * regionCounts, regionTargets, targetTotal, representedTotal, weightError,
 * ageTargets, ageGroupTargets, stageTargets, exactness and singleAgeUncertainty.
 * coverage.covers452Dccas is a count check only, not official-ID validation.
 * Weights are for represented-population reporting, never contact/crowding counts.
 *
 * Browser: WholeHkPopulation.allocate(...)
 * CommonJS: const { allocate } = require('./whole-hk-population.js');
 * Node ESM: import populationModel from './whole-hk-population.js';
 */
(function exposeWholeHkPopulation(root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else if (typeof define === "function" && define.amd) define([], factory);
  else root.WholeHkPopulation = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createPopulationModule() {
  "use strict";

  const GROUPS = [
    { id: "primary_1_3", min: 6, max: 8, stage: "primary" },
    { id: "primary_4_6", min: 9, max: 11, stage: "primary" },
    { id: "secondary_1_3", min: 12, max: 16, stage: "secondary" },
  ];
  const compareIds = (left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0;

  function sum(values) {
    let total = 0;
    let correction = 0;
    for (const value of values) {
      const adjusted = value - correction;
      const next = total + adjusted;
      correction = (next - total) - adjusted;
      total = next;
    }
    return total;
  }

  function positiveTotal(values, label) {
    const total = sum(values);
    if (!Number.isFinite(total) || total <= 0) {
      throw new RangeError(`${label} must have a finite positive total`);
    }
    return total;
  }

  function validateId(id, label) {
    if (typeof id !== "string" || !id.length || id.trim() !== id) {
      throw new TypeError(`${label} must be a nonempty trimmed string`);
    }
  }

  function normalizeRegions(regions) {
    if (!Array.isArray(regions) || !regions.length) {
      throw new TypeError("regions must be a nonempty array");
    }
    const regionIds = new Set();
    const areaIds = new Set();
    return Array.from(regions, (region) => {
      validateId(region?.id, "Region id");
      if (regionIds.has(region.id)) throw new TypeError(`Duplicate region id: ${region.id}`);
      regionIds.add(region.id);
      if (!Array.isArray(region.areas) || !region.areas.length) {
        throw new TypeError(`Region ${region.id} areas must be a nonempty array`);
      }
      const areas = Array.from(region.areas, (area) => {
        validateId(area?.id, "DCCA id");
        if (areaIds.has(area.id)) throw new TypeError(`Duplicate DCCA id: ${area.id}`);
        areaIds.add(area.id);
        if (!Array.isArray(area.ages) || !area.ages.length) {
          throw new TypeError(`DCCA ${area.id} ages must be a nonempty array`);
        }
        const seenAges = new Set();
        const ages = Array.from(area.ages, (entry) => {
          if (!Number.isInteger(entry?.age) || entry.age < 6 || entry.age > 16) {
            throw new TypeError(`DCCA ${area.id} age must be an integer from 6 to 16`);
          }
          if (seenAges.has(entry.age)) throw new TypeError(`Duplicate age ${entry.age} in ${area.id}`);
          seenAges.add(entry.age);
          if (!Number.isFinite(entry.populationEstimate) || entry.populationEstimate <= 0) {
            throw new TypeError(`DCCA ${area.id} age ${entry.age} populationEstimate must be finite and positive`);
          }
          return { age: entry.age, populationEstimate: entry.populationEstimate };
        }).sort((left, right) => left.age - right.age);
        return { id: area.id, ages };
      }).sort(compareIds);
      const strata = areas.flatMap((area) => GROUPS.map((group) => {
        const ages = area.ages.filter(({ age }) => age >= group.min && age <= group.max);
        if (!ages.length) throw new TypeError(`DCCA ${area.id} is missing age group ${group.id}`);
        return {
          id: `${area.id}:${group.id}`,
          homeZoneId: area.id,
          group,
          ages,
          minimum: 1,
          target: positiveTotal(ages.map((entry) => entry.populationEstimate), area.id),
        };
      }));
      return {
        id: region.id,
        areaCount: areas.length,
        strata,
        minimum: strata.length,
        target: positiveTotal(strata.map((stratum) => stratum.target), region.id),
      };
    }).sort(compareIds);
  }

  function proportionalCounts(population, rows) {
    const counts = rows.map(() => 0);
    let remaining = population;
    let active = rows.map((_, index) => index);
    // Pin binding minima, then reapportion the remaining population. Adding a
    // minimum to every proportional quota would distort unconstrained regions.
    while (active.length) {
      const total = positiveTotal(active.map((index) => rows[index].target), "Active quotas");
      const pinned = active.filter((index) => remaining * (rows[index].target / total) < rows[index].minimum);
      if (pinned.length) {
        const pinnedSet = new Set(pinned);
        for (const index of pinned) {
          counts[index] = rows[index].minimum;
          remaining -= counts[index];
        }
        active = active.filter((index) => !pinnedSet.has(index));
        continue;
      }
      const quotas = active.map((index) => {
        const raw = remaining * (rows[index].target / total);
        counts[index] = Math.floor(raw);
        return { index, fraction: raw - counts[index] };
      }).sort((left, right) => right.fraction - left.fraction || left.index - right.index);
      const remainder = remaining - sum(active.map((index) => counts[index]));
      if (!Number.isInteger(remainder) || remainder < 0 || remainder > quotas.length) {
        throw new RangeError("Population quotas exceed numeric precision");
      }
      for (let index = 0; index < remainder; index += 1) counts[quotas[index].index] += 1;
      break;
    }
    if (sum(counts) !== population || counts.some((count, index) => count < rows[index].minimum)) {
      throw new RangeError("Cannot honor population and stratum minima");
    }
    return counts;
  }

  function seededRandom(seed) {
    let state = seed;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = Math.imul(state ^ (state >>> 15), 1 | state);
      value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function summary(target, estimated, agents) {
    const error = estimated - target;
    return { target, estimated, error, absoluteError: Math.abs(error), relativeError: target ? error / target : null, agents };
  }

  function allocate(options) {
    if (!options || typeof options !== "object") throw new TypeError("allocate requires an options object");
    const { population, seed } = options;
    if (!Number.isSafeInteger(population) || population <= 0) {
      throw new RangeError("population must be a positive safe integer");
    }
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
      throw new RangeError("seed must be an unsigned 32-bit integer");
    }
    const regions = normalizeRegions(options.regions);
    const minimum = sum(regions.map((region) => region.minimum));
    if (population < minimum) throw new RangeError(`population ${population} is below minimum ${minimum}`);
    const targetTotal = positiveTotal(regions.map((region) => region.target), "Territory");
    const regionCounts = proportionalCounts(population, regions);
    const random = seededRandom(seed);
    const profiles = [];
    const strata = [];
    const regionTargets = [];

    regions.forEach((region, regionIndex) => {
      const counts = proportionalCounts(regionCounts[regionIndex], region.strata);
      const regionLedger = [];
      region.strata.forEach((stratum, stratumIndex) => {
        const count = counts[stratumIndex];
        const censusWeight = stratum.target / count;
        if (!Number.isFinite(censusWeight) || censusWeight <= 0) {
          throw new RangeError(`Stratum ${stratum.id} censusWeight is not finite and positive`);
        }
        const offset = random();
        const ageCounts = stratum.ages.map(() => 0);
        let ageIndex = 0;
        let cumulative = stratum.ages[0].populationEstimate / stratum.target;
        for (let index = 0; index < count; index += 1) {
          const point = (index + offset) / count;
          while (ageIndex < stratum.ages.length - 1 && point >= cumulative) {
            ageIndex += 1;
            cumulative += stratum.ages[ageIndex].populationEstimate / stratum.target;
          }
          const selectedAge = stratum.ages[ageIndex];
          ageCounts[ageIndex] += 1;
          profiles.push({
            scope: region.id,
            homeZoneId: stratum.homeZoneId,
            age: selectedAge.age,
            stratumId: stratum.id,
            censusWeight,
            targetAgePopulation: selectedAge.populationEstimate,
          });
        }
        const row = {
          stratumId: stratum.id,
          scope: region.id,
          homeZoneId: stratum.homeZoneId,
          ageGroup: stratum.group.id,
          stage: stratum.group.stage,
          censusWeight,
          ...summary(stratum.target, count * censusWeight, count),
          ageTargets: stratum.ages.map((entry, index) => ({
            age: entry.age,
            ...summary(entry.populationEstimate, ageCounts[index] * censusWeight, ageCounts[index]),
          })),
        };
        strata.push(row);
        regionLedger.push(row);
      });
      regionTargets.push({
        scope: region.id,
        minimum: region.minimum,
        dccaCount: region.areaCount,
        ...summary(region.target, sum(regionLedger.map((row) => row.estimated)), regionCounts[regionIndex]),
      });
    });

    const aggregate = (rows) => summary(
      sum(rows.map((row) => row.target)),
      sum(rows.map((row) => row.estimated)),
      sum(rows.map((row) => row.agents)),
    );
    const singleAges = strata.flatMap((stratum) => stratum.ageTargets);
    const ageTargets = Array.from({ length: 11 }, (_, index) => ({
      age: index + 6,
      ...aggregate(singleAges.filter((row) => row.age === index + 6)),
    }));
    const representedTotal = sum(profiles.map((profile) => profile.censusWeight));
    const inputDccas = sum(regions.map((region) => region.areaCount));
    const representedDccas = new Set(profiles.map((profile) => profile.homeZoneId)).size;
    const report = {
      schemaVersion: "v12.13-whole-hk-population-v1",
      population,
      minimum,
      seed,
      method: "minimum-constrained-largest-remainder; seeded-systematic-age-sampling",
      coverage: {
        inputDccas,
        representedDccas,
        referenceDccas: 452,
        allInputDccasRepresented: representedDccas === inputDccas,
        covers452Dccas: inputDccas === 452 && representedDccas === 452,
        officialMembershipVerified: false,
      },
      stratumCount: strata.length,
      regionCounts: Object.fromEntries(regions.map((region, index) => [region.id, regionCounts[index]])),
      regionTargets,
      targetTotal,
      representedTotal,
      weightError: representedTotal - targetTotal,
      strata,
      ageTargets,
      ageGroupTargets: GROUPS.map((group) => ({
        ageGroup: group.id,
        ageMin: group.min,
        ageMax: group.max,
        ...aggregate(strata.filter((stratum) => stratum.ageGroup === group.id)),
      })),
      stageTargets: ["primary", "secondary"].map((stage) => ({
        stage,
        ...aggregate(strata.filter((stratum) => stratum.stage === stage)),
      })),
      exactness: {
        stage: "exact-within-floating-point-precision",
        ageGroup: "exact-within-floating-point-precision",
        singleAge: "systematic-sample-not-exact",
      },
      singleAgeUncertainty: {
        maxAbsoluteError: Math.max(...ageTargets.map((row) => row.absoluteError)),
        totalAbsoluteError: sum(ageTargets.map((row) => row.absoluteError)),
        withinStratumMaxAbsoluteError: Math.max(...singleAges.map((row) => row.absoluteError)),
        exactnessGuaranteed: false,
        confidenceInterval: null,
      },
    };
    return { profiles, report };
  }

  return Object.freeze({ allocate });
});
