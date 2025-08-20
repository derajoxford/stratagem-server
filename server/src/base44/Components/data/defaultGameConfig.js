export const defaultGameConfig = {
    city_creation_base_cost: 500000,
    city_creation_scaling_factor: 1.5,
    market_ticker_speed_seconds: 30,
    turn_processing_interval_ms: 300000,
    war_settings: {
        tactical_points_per_turn: 1,
        tactical_points_on_war_start: 3,
        max_tactical_points: 10,
        resistance_decay_per_turn: 2,
        action_point_costs: {
            ground_assault: 1,
            strategic_bombing: 2,
            naval_strike: 2,
            air_superiority: 1,
            naval_blockade: 3,
            nuclear_strike: 5
        },
        unit_combat_strengths: {
            soldiers: 1,
            tanks: 10,
            aircraft: 25,
            warships: 50,
            conventional_bombs: 100,
            nuclear_weapons: 10000
        },
        power_ratio_modifiers: {
            severely_outgunned: -25,
            significantly_outgunned: -15,
            slightly_outgunned: -8,
            even_match: 0,
            slight_advantage: 8,
            significant_advantage: 15,
            overwhelming_advantage: 25
        },
        ground_assault: {
            success_levels: [
                { name: 'Total Victory', min_roll: 120, max_roll: 200, multiplier: 2.5 },
                { name: 'Major Victory', min_roll: 95, max_roll: 119, multiplier: 1.5 },
                { name: 'Minor Victory', min_roll: 75, max_roll: 94, multiplier: 1.0 },
                { name: 'Stalemate', min_roll: 50, max_roll: 74, multiplier: 0.5 },
                { name: 'Minor Defeat', min_roll: 25, max_roll: 49, multiplier: 0.2 },
                { name: 'Major Defeat', min_roll: 1, max_roll: 24, multiplier: 0.0 }
            ]
        },
        strategic_bombing: {
            success_levels: [
                 { name: 'Devastating Success', min_roll: 130, max_roll: 200, multiplier: 2.5 },
                 { name: 'Significant Success', min_roll: 100, max_roll: 129, multiplier: 1.5 },
                 { name: 'Moderate Success', min_roll: 80, max_roll: 99, multiplier: 1.0 },
                 { name: 'Minimal Success', min_roll: 60, max_roll: 79, multiplier: 0.5 },
                 { name: 'Failure', min_roll: 1, max_roll: 59, multiplier: 0.1 }
            ]
        },
        naval_strike: {
            success_levels: [
                { name: 'Overwhelming Victory', min_roll: 125, max_roll: 200, multiplier: 2.5 },
                { name: 'Decisive Victory', min_roll: 98, max_roll: 124, multiplier: 1.5 },
                { name: 'Victory', min_roll: 78, max_roll: 97, multiplier: 1.0 },
                { name: 'Draw', min_roll: 55, max_roll: 77, multiplier: 0.5 },
                { name: 'Defeat', min_roll: 30, max_roll: 54, multiplier: 0.2 },
                { name: 'Crushing Defeat', min_roll: 1, max_roll: 29, multiplier: 0.0 }
            ]
        },
        naval_blockade: {
            success_levels: [
                { name: 'Blockade Established', min_roll: 85, max_roll: 200, multiplier: 1.0 },
                { name: 'Blockade Failed', min_roll: 1, max_roll: 84, multiplier: 0.0 }
            ]
        },
        air_superiority: {
            success_levels: [
                { name: 'Total Air Dominance', min_roll: 110, max_roll: 200, multiplier: 1.0 },
                { name: 'Contested Skies', min_roll: 60, max_roll: 109, multiplier: 0.5 },
                { name: 'Airspace Lost', min_roll: 1, max_roll: 59, multiplier: 0.1 }
            ]
        },
        nuclear_strike: {
            success_levels: [
                { name: 'Apocalyptic Detonation', min_roll: 150, max_roll: 200, multiplier: 5.0 },
                { name: 'Catastrophic Impact', min_roll: 100, max_roll: 149, multiplier: 2.0 },
                { name: 'Direct Hit', min_roll: 75, max_roll: 99, multiplier: 1.0 },
                { name: 'Launch Failure', min_roll: 1, max_roll: 74, multiplier: 0.0 }
            ]
        },
        max_resistance_damage_per_attack: {
            ground_assault: 15,
            strategic_bombing: 10,
            naval_strike: 8,
            air_superiority: 5,
            naval_blockade: 0,
            nuclear_strike: 50
        },
        final_resistance_damage_caps: {
            ground_assault: 25,
            strategic_bombing: 18,
            naval_strike: 15,
            air_superiority: 8,
            naval_blockade: 0,
            nuclear_strike: 75
        }
    },
    environmental_settings: {
        local_pollution_decay_rate_percent: 5,
        global_pollution_decay_rate_percent: 1,
        local_fallout_decay_rate_percent: 2,
        global_radiation_decay_rate_percent: 0.5,
        pollution_to_global_ratio: 0.1,
        radiation_to_global_ratio: 0.25,
        pollution_per_factory: 0.1,
        pollution_per_coal_plant: 1.0,
        pollution_per_oil_refinery: 0.5,
        fallout_per_nuke_detonation: 100,
        fallout_per_nuclear_plant_disaster: 250,
        max_city_health_impact_from_pollution: 20,
        max_city_health_impact_from_fallout: 50,
        disease_outbreak_threshold_health: 40,
        disease_base_duration_turns: 10
    }
};
