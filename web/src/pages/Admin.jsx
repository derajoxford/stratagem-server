
import React, { useState, useEffect, useCallback } from "react";
import { Settings, SlidersHorizontal, AlertTriangle, CheckCircle, Shield, Users, Coins, Zap, Swords, Wrench, Factory, Droplets, Leaf, University, HeartPulse, Building, Gem, Anchor, Crosshair, Atom, Globe, Loader2, Save, ShieldOff, Package, Play, Store, Database, Target, ShieldAlert, Clock, UserCog } from "lucide-react";
import { GameConfig, GameState, User, Nation, Alliance } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import GeneralSettings from "../components/admin/GeneralSettings";
import WarRulesSettings from "../components/admin/WarRulesSettings";
import UnitSpecsSettings from "../components/admin/UnitSpecsSettings";
import RefinedResourceSettings from "../components/admin/RefinedResourceSettings";
import PowerPlantSettings from "../components/admin/PowerPlantSettings";
import CombatSettings from "../components/admin/CombatSettings";
import ManualTurnProcessor from "../components/admin/ManualTurnProcessor";
import NationManagement from "../components/admin/NationManagement";
import UserManagement from "../components/admin/UserManagement";
import AllianceManagement from "../components/admin/AllianceManagement";
import MarketplaceManagement from "../components/admin/MarketplaceManagement";
import DatabaseReset from "../components/admin/DatabaseReset";
import WarManagementPanel from "../components/admin/WarManagementPanel";
import AdvancedWarSettings from "../components/admin/AdvancedWarSettings";
import BattleMechanicsSettings from "../components/admin/BattleMechanicsSettings";
import EnvironmentalSettings from "../components/admin/EnvironmentalSettings"; // New Import

const defaultGameConfig = {
    turn_duration_minutes: 60,
    market_ticker_speed_seconds: 30,
    city_creation_base_cost: 500000,
    city_creation_scaling_factor: 1.5,
    infrastructure_cost_per_point: 1000,
    infrastructure_scaling_factor: 1.02,
    improvement_sell_percentage: 75,
    land_sell_percentage: 50,
    infrastructure_sell_percentage: 50,
    soldiers_cost: {
        money: 1000,
        resources: {
            oil: 0, gasoline: 0, iron: 0, steel: 1, aluminum: 0, coal: 0, uranium: 0,
            food: 0, gold: 0, bauxite: 0, copper: 0, diamonds: 0, wood: 0, ammo: 0
        }
    },
    tanks_cost: {
        money: 50000,
        resources: {
            oil: 0, gasoline: 0, iron: 0, steel: 10, aluminum: 5, coal: 0, uranium: 0,
            food: 0, gold: 0, bauxite: 0, copper: 0, diamonds: 0, wood: 0, ammo: 0
        }
    },
    aircraft_cost: {
        money: 100000,
        resources: {
            oil: 0, gasoline: 0, iron: 0, steel: 20, aluminum: 15, coal: 0, uranium: 0,
            food: 0, gold: 0, bauxite: 0, copper: 5, diamonds: 0, wood: 0, ammo: 0
        }
    },
    warships_cost: {
        money: 200000,
        resources: {
            oil: 0, gasoline: 0, iron: 0, steel: 50, aluminum: 25, coal: 0, uranium: 0,
            food: 0, gold: 0, bauxite: 0, copper: 10, diamonds: 0, wood: 0, ammo: 0
        }
    },
    conventional_bombs_cost: {
        money: 25000,
        resources: {
            oil: 0, gasoline: 0, iron: 0, steel: 5, aluminum: 0, coal: 0, uranium: 2,
            food: 0, gold: 0, bauxite: 0, copper: 0, diamonds: 0, wood: 0, ammo: 0
        }
    },
    nuclear_weapons_cost: {
        money: 10000000,
        resources: {
            oil: 0, gasoline: 0, iron: 0, steel: 100, aluminum: 50, coal: 0, uranium: 50,
            food: 0, gold: 0, bauxite: 0, copper: 0, diamonds: 0, wood: 0, ammo: 0
        }
    },
    resource_production_rates: {
        oil_wells: 50,
        coal_mines: 40,
        iron_mines: 35,
        steel_mills: 25,
        aluminum_smelters: 20,
        bauxite_mines: 30,
        farms: 100,
        copper_mines: 25,
        gold_mines: 10,
        diamond_mines: 5,
        uranium_mines: 15,
        forestry: 60
    },
    refined_resource_recipes: {
        steel: { iron: 2, coal: 1 },
        aluminum: { bauxite: 3 },
        gasoline: { oil: 2 }
    },
    power_plant_settings: {
        coal_power_plants: { power_output: 10, coal_consumption: 5 },
        nuclear_power_plants: { power_output: 25, uranium_consumption: 2 }
    },
    city_improvement_effects: {
        banks: { income_multiplier: 1.15 },
        factories: { income_multiplier: 1.10 },
        shopping_malls: { income_multiplier: 1.12 },
        corporate_offices: { income_multiplier: 1.08 },
        logistics_hubs: { income_multiplier: 1.05 },
        hospitals: { happiness_boost: 5 },
        schools: { happiness_boost: 3 },
        recycling_center: { pollution_reduction: 15 },
        stormwater_management: { pollution_reduction: 10 },
        public_transit: { pollution_reduction: 8, happiness_boost: 2 },
        ev_incentives: { pollution_reduction: 5 }
    },
    city_improvement_costs: {
        banks: { money: 100000, resources: {} },
        factories: { money: 150000, resources: {} },
        shopping_malls: { money: 120000, resources: {} },
        corporate_offices: { money: 80000, resources: {} },
        logistics_hubs: { money: 90000, resources: {} },
        hospitals: { money: 200000, resources: {} },
        schools: { money: 150000, resources: {} },
        coal_power_plants: { money: 300000, resources: {} },
        nuclear_power_plants: { money: 1000000, resources: {} },
        uranium_mines: { money: 250000, resources: {} },
        coal_mines: { money: 200000, resources: {} },
        iron_mines: { money: 180000, resources: {} },
        steel_mills: { money: 400000, resources: {} },
        aluminum_smelters: { money: 350000, resources: {} },
        bauxite_mines: { money: 200000, resources: {} },
        oil_wells: { money: 300000, resources: {} },
        oil_refineries: { money: 500000, resources: {} },
        farms: { money: 100000, resources: {} },
        copper_mines: { money: 150000, resources: {} },
        gold_mines: { money: 300000, resources: {} },
        diamond_mines: { money: 500000, resources: {} },
        military_bases: { money: 250000, resources: {} },
        ground_armaments: { money: 180000, resources: {} },
        airports: { money: 400000, resources: {} },
        seaports: { money: 600000, resources: {} },
        forestry: { money: 120000, resources: {} },
        recycling_center: { money: 180000, resources: {} },
        stormwater_management: { money: 150000, resources: {} },
        public_transit: { money: 250000, resources: {} },
        ev_incentives: { money: 100000, resources: {} },
        ammunition_factories: { money: 200000, resources: {} },
        bomb_factories: { money: 800000, resources: {} },
        high_energy_weapons_center: { money: 2000000, resources: {} }
    },
    city_improvement_limits: {
        banks: 5,
        factories: 10,
        shopping_malls: 8,
        corporate_offices: 15,
        logistics_hubs: 6,
        hospitals: 4,
        schools: 6,
        coal_power_plants: 5,
        nuclear_power_plants: 3,
        uranium_mines: 8,
        coal_mines: 10,
        iron_mines: 8,
        steel_mills: 6,
        aluminum_smelters: 4,
        bauxite_mines: 6,
        oil_wells: 12,
        oil_refineries: 4,
        farms: 15,
        copper_mines: 6,
        gold_mines: 4,
        diamond_mines: 2,
        military_bases: 3,
        ground_armaments: 5,
        airports: 2,
        seaports: 2,
        forestry: 10,
        recycling_center: 3,
        stormwater_management: 4,
        public_transit: 5,
        ev_incentives: 8,
        ammunition_factories: 4,
        bomb_factories: 2,
        high_energy_weapons_center: 1
    },
    military_base_unit_capacities: {
        soldiers: 10000,
        tanks: 500
    },
    airport_unit_capacities: {
        aircraft: 200
    },
    seaport_unit_capacities: {
        warships: 100
    },
    bomb_factory_unit_capacities: {
        conventional_bombs: 10
    },
    high_energy_weapons_center_capacities: {
        nuclear_weapons: 2
    },
    unit_resource_requirements: {
        soldiers: { steel: 1 },
        tanks: { steel: 10, aluminum: 5 },
        aircraft: { steel: 20, aluminum: 15, copper: 5 },
        warships: { steel: 50, aluminum: 25, copper: 10 },
        conventional_bombs: { steel: 5, uranium: 2 },
        nuclear_weapons: { uranium: 50, steel: 100, aluminum: 50 }
    },
    war_settings: {
        initial_resistance: 100,
        war_declaration_cost: 1000000,
        max_offensive_wars: 3,
        max_defensive_wars: 5,
        tactical_points_on_war_start: 3,
        tactical_points_per_turn: 2,
        max_tactical_points: 10,
        combat_action_cooldown_seconds: 30,
        max_conventional_bombs_per_strike: 5,
        max_nuclear_weapons_per_strike: 1,
        per_battle_loot_eligible_attack_types: ["ground_battle", "air_strike", "naval_battle"],
        war_victory_nation_cash_loot_max_percent: 15,
        war_victory_nation_resource_loot_max_percent: 10,
        war_victory_alliance_bank_loot_max_percent: 5,
        loot_settings: {
            base_loot_pool_percent_of_defender_treasury: 5,
            per_outcome_loot_percent: {
                "Catastrophic Failure": { min_percent: 0, max_percent: 0 },
                "Major Defeat": { min_percent: 0, max_percent: 0 },
                "Defeat": { min_percent: 0, max_percent: 0 },
                "Stalemate": { min_percent: 0, max_percent: 5 },
                "Minor Victory": { min_percent: 20, max_percent: 40 },
                "Victory": { min_percent: 50, max_percent: 75 },
                "Decisive Victory": { min_percent: 80, max_percent: 100 },
                "Mission Failed": { min_percent: 0, max_percent: 0 },
                "Poor Results": { min_percent: 0, max_percent: 0 },
                "Limited Success": { min_percent: 0, max_percent: 10 },
                "Successful Strike": { min_percent: 25, max_percent: 45 },
                "Highly Effective": { min_percent: 55, max_percent: 80 },
                "Devastating Strike": { min_percent: 85, max_percent: 100 },
                "Fleet Routed": { min_percent: 0, max_percent: 0 },
                "Heavy Losses": { min_percent: 0, max_percent: 0 },
                "Tactical Withdrawal": { min_percent: 0, max_percent: 10 },
                "Engagement Won": { min_percent: 25, max_percent: 45 },
                "Naval Victory": { min_percent: 55, max_percent: 80 },
                "Decisive Naval Victory": { min_percent: 85, max_percent: 100 },
                "Bombardment Failed": { min_percent: 0, max_percent: 0 },
                "Limited Damage": { min_percent: 0, max_percent: 5 },
                "Effective Bombardment": { min_percent: 15, max_percent: 30 },
                "Heavy Bombardment": { min_percent: 40, max_percent: 60 },
                "Devastating Bombardment": { min_percent: 70, max_percent: 100 },
                "Weapon Malfunction": { min_percent: 0, max_percent: 0 },
                "Limited Nuclear Impact": { min_percent: 0, max_percent: 0 },
                "Nuclear Strike": { min_percent: 0, max_percent: 0 },
                "Devastating Nuclear Strike": { min_percent: 0, max_percent: 0 }
            }
        },
        action_point_costs: {
            ground_battle: 1,
            air_strike: 2,
            naval_battle: 2,
            bombardment: 3,
            nuclear_strike: 5
        },
        attacker_loss_config: {
            ground_battle: {
                soldiers: { base_rate: 0.08, max_rate: 0.5 },
                tanks: { base_rate: 0.04, max_rate: 0.3 }
            },
            air_strike: {
                aircraft: { base_rate: 0.05, max_rate: 0.4 }
            },
            naval_battle: {
                warships: { base_rate: 0.05, max_rate: 0.4 }
            },
            bombardment: {
                aircraft: { base_rate: 0.02, max_rate: 0.1 }
            },
            nuclear_strike: {
                aircraft: { base_rate: 0.01, max_rate: 0.05 }
            }
        },
        unit_combat_strengths: {
            soldiers: 1.0,
            tanks: 15.0,
            aircraft: 25.0,
            warships: 40.0,
            conventional_bombs: 100.0,
            nuclear_weapons: 1000.0
        },
        max_resistance_damage_per_attack: {
            ground_battle: 3,
            air_strike: 4,
            naval_battle: 5,
            bombardment: 7,
            nuclear_strike: 14
        },
        final_resistance_damage_caps: {
            ground_battle: 5,
            air_strike: 8,
            naval_battle: 10,
            bombardment: 15,
            nuclear_strike: 25
        },
        loss_distribution: {
            ground_battle: {
                primary_targets: {
                    soldiers: 70,
                    tanks: 25
                },
                collateral_damage: {
                    aircraft: 3,
                    warships: 2
                }
            },
            air_strike: {
                primary_targets: {
                    aircraft: 40,
                    tanks: 30,
                    warships: 20
                },
                collateral_damage: {
                    soldiers: 10
                }
            },
            naval_battle: {
                primary_targets: {
                    warships: 60,
                    aircraft: 25
                },
                collateral_damage: {
                    tanks: 10,
                    soldiers: 5
                }
            },
            bombardment: {
                primary_targets: {
                    soldiers: 50,
                    tanks: 30,
                    aircraft: 15
                },
                collateral_damage: {
                    warships: 5
                }
            },
            nuclear_strike: {
                primary_targets: {
                    soldiers: 40,
                    tanks: 25,
                    aircraft: 20,
                    warships: 15
                },
                collateral_damage: {}
            }
        },
        damage_settings: {
            infrastructure_damage_ranges: {
                ground_battle: { min: 1, max: 5 },
                air_strike: { min: 3, max: 8 },
                naval_battle: { min: 2, max: 6 },
                bombardment: { min: 5, max: 15 },
                nuclear_strike: { min: 25, max: 50 }
            },
            civilian_casualty_ranges: {
                ground_battle: { min: 100, max: 1000 },
                air_strike: { min: 500, max: 2000 },
                naval_battle: { min: 200, max: 800 },
                bombardment: { min: 1000, max: 5000 },
                nuclear_strike: { min: 50000, max: 200000 }
            }
        },
        ammo_consumption_rates: {
            soldiers: 0.5,
            tanks: 1.0,
            aircraft: 2.0,
            warships: 3.0,
            conventional_bombs: 0,
            nuclear_weapons: 0
        },
        gasoline_consumption_rates: {
            soldiers: 0,
            tanks: 0.5,
            aircraft: 1.5,
            warships: 2.0,
            conventional_bombs: 0,
            nuclear_weapons: 0
        },
        ammo_effectiveness_settings: {
            insufficient_ammo_penalty_percent: 50,
            defender_ammo_consumption_rates: {
                soldiers: 0.3,
                tanks: 0.7,
                aircraft: 1.5,
                warships: 2.0
            }
        },
        gasoline_effectiveness_settings: {
            insufficient_gasoline_penalty_percent: 50,
            defender_gasoline_consumption_rates: {
                tanks: 0.3,
                aircraft: 1.0,
                warships: 1.5
            }
        },
        // The following were replaced by loot_settings but are kept as examples if needed elsewhere
        // per_battle_loot_eligible_attack_types: ["ground_battle", "air_strike", "naval_battle"],
        // loot_cap_percent: 5,
        // war_victory_nation_cash_loot_max_percent: 15,
        // war_victory_nation_resource_loot_max_percent: 10,
        // war_victory_alliance_bank_loot_max_percent: 5,
        nuclear_strike_mechanics: {
            cities_affected_percentage: 100,
            infrastructure_destruction_percentage: 70,
            population_reduction_min_percent: 50,
            population_reduction_max_percent: 90,
            happiness_reduction_points: 70,
            ruined_state_duration_turns: 5,
            prioritize_military_targets: true,
            ground_zero_destruction_percentage: 100,
            blast_radius_destruction_percentage: 50
        },
        ground_battle: {
            success_levels: [
                { name: "Catastrophic Failure", min_roll: 1, max_roll: 10, multiplier: 0.1 },
                { name: "Major Defeat", min_roll: 11, max_roll: 25, multiplier: 0.3 },
                { name: "Defeat", min_roll: 26, max_roll: 40, multiplier: 0.5 },
                { name: "Stalemate", min_roll: 41, max_roll: 60, multiplier: 0.7 },
                { name: "Minor Victory", min_roll: 61, max_roll: 75, multiplier: 1.0 },
                { name: "Victory", min_roll: 76, max_roll: 90, multiplier: 1.3 },
                { name: "Decisive Victory", min_roll: 91, max_roll: 100, multiplier: 1.6 }
            ]
        },
        air_strike: {
            success_levels: [
                { name: "Mission Failed", min_roll: 1, max_roll: 15, multiplier: 0.2 },
                { name: "Poor Results", min_roll: 16, max_roll: 30, multiplier: 0.4 },
                { name: "Limited Success", min_roll: 31, max_roll: 50, multiplier: 0.6 },
                { name: "Successful Strike", min_roll: 51, max_roll: 70, multiplier: 0.9 },
                { name: "Highly Effective", min_roll: 71, max_roll: 85, multiplier: 1.2 },
                { name: "Devastating Strike", min_roll: 86, max_roll: 100, multiplier: 1.5 }
            ]
        },
        naval_battle: {
            success_levels: [
                { name: "Fleet Routed", min_roll: 1, max_roll: 12, multiplier: 0.15 },
                { name: "Heavy Losses", min_roll: 13, max_roll: 28, multiplier: 0.35 },
                { name: "Tactical Withdrawal", min_roll: 29, max_roll: 45, multiplier: 0.55 },
                { name: "Engagement Won", min_roll: 46, max_roll: 65, multiplier: 0.8 },
                { name: "Naval Victory", min_roll: 66, max_roll: 82, multiplier: 1.1 },
                { name: "Decisive Naval Victory", min_roll: 83, max_roll: 100, multiplier: 1.4 }
            ]
        },
        bombardment: {
            success_levels: [
                { name: "Bombardment Failed", min_roll: 1, max_roll: 20, multiplier: 0.25 },
                { name: "Limited Damage", min_roll: 21, max_roll: 40, multiplier: 0.5 },
                { name: "Effective Bombardment", min_roll: 41, max_roll: 70, multiplier: 0.85 },
                { name: "Heavy Bombardment", min_roll: 71, max_roll: 90, multiplier: 1.2 },
                { name: "Devastating Bombardment", min_roll: 91, max_roll: 100, multiplier: 1.7 }
            ]
        },
        nuclear_strike: {
            success_levels: [
                { name: "Weapon Malfunction", min_roll: 1, max_roll: 5, multiplier: 0.1 },
                { name: "Limited Nuclear Impact", min_roll: 6, max_roll: 25, multiplier: 0.6 },
                { name: "Nuclear Strike", min_roll: 26, max_roll: 75, multiplier: 1.5 },
                { name: "Devastating Nuclear Strike", min_roll: 76, max_roll: 100, multiplier: 2.5 }
            ]
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
        allow_admin_war_override: false
    },
    environmental_settings: {
        local_pollution_decay_rate_percent: 1.5,
        local_fallout_decay_rate_percent: 5.0,
        global_pollution_decay_rate_percent: 0.5,
        global_radiation_decay_rate_percent: 2.0,
        pollution_reduction_per_acre: 0.005,
        infrastructure_pollution_factors: {
            factories: 5,
            coal_power_plants: 15,
            nuclear_power_plants: 2,
            recycling_center: -10,
            stormwater_management: -2,
            public_transit: -3,
            ev_incentives: -1,
            oil_refineries: 8,
            steel_mills: 10,
        },
        health_score_pollution_impact: {
            local_pollution: -0.5,
            local_fallout: -2.0,
            global_radiation: -0.1,
        },
        local_pollution_food_reduction_thresholds: [
            { level: 50, reduction_percent: 10 },
            { level: 75, reduction_percent: 25 },
        ],
        local_fallout_food_reduction_thresholds: [
            { level: 25, reduction_percent: 15 },
            { level: 50, reduction_percent: 40 },
        ],
        global_pollution_food_reduction_thresholds: [
            { level: 1000, reduction_percent: 5 },
            { level: 5000, reduction_percent: 15 },
        ],
        global_radiation_food_reduction_thresholds: [
            { level: 500, reduction_percent: 20 },
            { level: 2000, reduction_percent: 50 },
        ]
    },
    population_settings: {
        base_birth_rate_percent: 0.5,
        pollution_population_growth_penalty_thresholds: [
             { level: 40, penalty_percent: 20 },
             { level: 70, penalty_percent: 50 },
        ],
        health_population_growth_penalty_thresholds: [
            { score: 80, penalty_percent: 10 },
            { score: 50, penalty_percent: 40 },
        ],
    },
    disease_settings: {
        disease_threshold_health_score: 60,
        disease_chance_percent: 5,
        disease_duration_turns: 12,
        disease_population_reduction_percent: 0.2,
        disease_income_reduction_percent: 10,
        disease_food_reduction_percent: 15,
        disease_cure_cost_base: 500000,
    }
};

// Helper function to parse config from JSON string safely
const parseConfigFromJson = (configJsonString) => {
    try {
        return JSON.parse(configJsonString);
    } catch (error) {
        console.error("Failed to parse config JSON string:", error);
        return {}; // Fallback to an empty object for merging
    }
};

// Helper function to create a truly deep clone
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
};

const deepMerge = (defaults, config) => {
    // Create a deep clone of defaults to prevent mutation
    let merged = deepClone(defaults);
    
    if (!config || typeof config !== 'object') {
        return merged;
    }
    
    for (const key in config) {
        if (Object.prototype.hasOwnProperty.call(config, key)) {
            if (
                merged[key] && typeof merged[key] === 'object' && !Array.isArray(merged[key]) &&
                config[key] && typeof config[key] === 'object' && !Array.isArray(config[key])
            ) {
                merged[key] = deepMerge(merged[key], config[key]);
            } else {
                // For arrays and primitive values, use the config value directly, but clone it if it's an object/array
                merged[key] = deepClone(config[key]);
            }
        }
    }
    return merged;
};

export default function AdminPage() {
    const [gameConfig, setGameConfig] = useState(null);
    const [gameConfigEntity, setGameConfigEntity] = useState(null); // Add state for the raw entity
    const [gameState, setGameState] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState("general");

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const currentUser = await User.me();
            setUser(currentUser);

            const [configs, gameStates] = await Promise.all([
                GameConfig.list(),
                GameState.list()
            ]);

            const currentConfigEntity = (configs && configs.length > 0) ? configs[0] : null;
            setGameConfigEntity(currentConfigEntity);

            let parsedConfig = {};
            if (currentConfigEntity && currentConfigEntity.config_data_json) {
                try {
                    parsedConfig = parseConfigFromJson(currentConfigEntity.config_data_json);
                    console.log('Admin: Parsed config from database:', parsedConfig);
                } catch (error) {
                    console.error('Admin: Failed to parse config from database:', error);
                    parsedConfig = {};
                }
            } else {
                console.log('Admin: No config found in database, using defaults');
            }
            
            // Create a truly deep clone of defaultGameConfig before merging
            const cleanDefaultConfig = deepClone(defaultGameConfig);
            const finalConfig = deepMerge(cleanDefaultConfig, parsedConfig);
            
            // Diagnostic logging for battle success levels
            console.log('Admin: Default config success levels for nuclear_strike:', 
                cleanDefaultConfig.war_settings?.nuclear_strike?.success_levels);
            console.log('Admin: Final config success levels for nuclear_strike (pre-patch):', 
                finalConfig.war_settings?.nuclear_strike?.success_levels);
            
            // Verify all attack types have success levels
            const attackTypes = ['ground_battle', 'air_strike', 'naval_battle', 'bombardment', 'nuclear_strike'];
            attackTypes.forEach(type => {
                if (!finalConfig.war_settings?.[type]?.success_levels || !Array.isArray(finalConfig.war_settings[type].success_levels) || finalConfig.war_settings[type].success_levels.length === 0) {
                    console.warn(`Admin: Missing, invalid, or empty success_levels for ${type}, restoring from defaults.`);
                    if (!finalConfig.war_settings) finalConfig.war_settings = {};
                    if (!finalConfig.war_settings[type]) finalConfig.war_settings[type] = {};
                    finalConfig.war_settings[type].success_levels = deepClone(cleanDefaultConfig.war_settings[type].success_levels);
                }
            });
            console.log('Admin: Final config success levels for nuclear_strike (post-patch):', 
                finalConfig.war_settings?.nuclear_strike?.success_levels);

            setGameConfig(finalConfig);
            setGameState(gameStates && gameStates.length > 0 ? gameStates[0] : null);
        } catch (error) {
            console.error("Failed to load admin data:", error);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleConfigChange = useCallback((path, value) => {
        setGameConfig(prevGameConfig => {
            if (!prevGameConfig) return prevGameConfig;

            // Create a deep clone to prevent mutation of the previous state
            const newConfig = deepClone(prevGameConfig);
            const keys = path.split('.');
            let current = newConfig;

            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                const nextKey = keys[i + 1];

                // Check if the next segment of the path is a number, which implies an array.
                const nextSegmentIsArray = !isNaN(parseInt(nextKey, 10));

                if (current[key] === undefined || current[key] === null) {
                    // If the path segment doesn't exist, create it as an array or object.
                    current[key] = nextSegmentIsArray ? [] : {};
                }
                
                current = current[key];
            }

            const finalKey = keys[keys.length - 1];
            let targetValue = value;
            
            const isCostMoneyPath = keys.length >= 2 && keys[keys.length - 2] === 'costs' && finalKey === 'money';

            if (typeof value === 'string') {
                if (value.toLowerCase() === 'true') {
                    targetValue = true;
                } else if (value.toLowerCase() === 'false') {
                    targetValue = false;
                } else if (!isNaN(parseFloat(value)) && value.trim() !== '') {
                    targetValue = parseFloat(value);
                } else if (value === '' || value === null) {
                    // Use deep cloned default for reference
                    let defaultRef = deepClone(defaultGameConfig);
                    let pathExistsInDefault = true;
                    for (const key of keys.slice(0, -1)) {
                        if (defaultRef && typeof defaultRef === 'object' && defaultRef.hasOwnProperty(key)) {
                            defaultRef = defaultRef[key];
                        } else {
                            pathExistsInDefault = false;
                            break;
                        }
                    }
                    if (pathExistsInDefault && defaultRef && typeof defaultRef === 'object' && typeof defaultRef[finalKey] === 'number') {
                        targetValue = 0;
                    } else if (isCostMoneyPath) {
                        targetValue = 0;
                    } else {
                        // If it's not a number field and value is empty/null, set to null or empty string based on context
                        targetValue = value; // Preserve original empty string or null
                    }
                }
            } else if (value === null) {
                // Use deep cloned default for reference
                let defaultRef = deepClone(defaultGameConfig);
                let pathExistsInDefault = true;
                for (const key of keys.slice(0, -1)) {
                    if (defaultRef && typeof defaultRef === 'object' && defaultRef.hasOwnProperty(key)) {
                        defaultRef = defaultRef[key];
                    } else {
                        pathExistsInDefault = false;
                        break;
                    }
                }
                if (pathExistsInDefault && defaultRef && typeof defaultRef === 'object' && typeof defaultRef[finalKey] === 'number') {
                    targetValue = 0;
                } else if (isCostMoneyPath) {
                    targetValue = 0;
                }
            }
            
            current[finalKey] = targetValue;
            
            console.log(`Admin: Config changed at path ${path} to:`, targetValue);
            
            return newConfig;
        });
    }, []);

    const saveConfig = async () => {
        if (!gameConfig || !user) return;
        setIsSaving(true);
        setFeedback(null);
        try {
            // Create a deep clone before stringifying to ensure data integrity
            const configToSave = deepClone(gameConfig);
            const configJsonString = JSON.stringify(configToSave, null, 2);
            
            console.log('Admin: Saving config with success levels (from state):', 
                configToSave.war_settings?.nuclear_strike?.success_levels);
            
            const configPayload = {
                config_data_json: configJsonString,
                config_version: "1.0",
                last_updated_by: user.email
            };
            
            const existingConfigs = await GameConfig.list();
            let savedConfig;
            
            if (existingConfigs && existingConfigs.length > 0) {
                savedConfig = await GameConfig.update(existingConfigs[0].id, configPayload);
            } else {
                savedConfig = await GameConfig.create(configPayload);
            }
            
            console.log('Admin: Config saved successfully');
            setFeedback({ type: 'success', message: 'Configuration saved successfully!' });
            
            // Reload data to verify persistence and update the UI with the saved state
            setTimeout(() => {
                loadData();
                setFeedback(null);
            }, 2000);
        } catch (error) {
            console.error('Save error:', error);
            setFeedback({ type: 'error', message: `Failed to save: ${error.message}` });
        }
        setIsSaving(false);
    };

    if (isLoading) return <div className="p-8 flex justify-center items-center h-screen"><Loader2 className="w-16 h-16 text-amber-400 animate-spin" /><p className="ml-4 text-slate-400">Loading admin panel...</p></div>;

    if (!user || user.role !== 'admin') {
        return (
            <div className="p-8">
                <div className="max-w-4xl mx-auto text-center">
                    <ShieldOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
                    <p className="text-slate-400">You must be an admin to access this panel.</p>
                </div>
            </div>
        );
    }

    // Helper function to get environmental status
    const getEnvironmentalStatus = () => {
        if (!gameState) return { status: 'unknown', label: 'Unknown', color: 'bg-gray-500' };
        
        const currentTurn = gameState.current_turn_number || 1;
        const lastEnvTurn = gameState.last_environmental_turn_number || 0;
        
        if (lastEnvTurn === currentTurn) {
            return { status: 'up-to-date', label: 'Up-to-date', color: 'bg-green-500' };
        } else if (lastEnvTurn === currentTurn - 1) {
            return { status: 'normal_delay', label: 'Normal Delay', color: 'bg-yellow-500' };
        } else if (lastEnvTurn < currentTurn - 1) {
            return { status: 'behind', label: 'Behind', color: 'bg-red-500' };
        } else {
            return { status: 'unknown', label: 'Unknown', color: 'bg-gray-500' };
        }
    };

    const envStatus = getEnvironmentalStatus();

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">Game Administration</h1>
                            <p className="text-slate-400 text-base lg:text-lg">Configure game mechanics and manage the world</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button 
                                onClick={saveConfig} 
                                disabled={isSaving}
                                className="bg-amber-600 hover:bg-amber-700 whitespace-nowrap px-4 py-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                {isSaving ? 'Saving...' : 'Save Configuration'}
                            </Button>
                        </div>
                    </div>
                    
                    {feedback && (
                        <div className={`px-4 py-3 rounded-lg flex items-center gap-2 text-sm mb-4 ${
                            feedback.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            <span>{feedback.message}</span>
                        </div>
                    )}
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="mb-8">
                        <TabsList className="h-auto flex-wrap gap-1 bg-slate-800/50 p-2 rounded-lg w-full justify-start">
                            <TabsTrigger value="general" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">General Settings</span>
                                <span className="sm:hidden">General</span>
                            </TabsTrigger>
                            <TabsTrigger value="battle-mechanics" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Target className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Battle Mechanics</span>
                                <span className="sm:hidden">Battle</span>
                            </TabsTrigger>
                            <TabsTrigger value="war-rules" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Swords className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">War Rules</span>
                                <span className="sm:hidden">War</span>
                            </TabsTrigger>
                            <TabsTrigger value="unit-specs" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Unit Specifications</span>
                                <span className="sm:hidden">Units</span>
                            </TabsTrigger>
                            <TabsTrigger value="combat" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Target className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Combat Settings</span>
                                <span className="sm:hidden">Combat</span>
                            </TabsTrigger>
                            <TabsTrigger value="refined-resources" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Factory className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Refined Resources</span>
                                <span className="sm:hidden">Refined</span>
                            </TabsTrigger>
                            <TabsTrigger value="power-plants" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Power Plants</span>
                                <span className="sm:hidden">Power</span>
                            </TabsTrigger>
                            <TabsTrigger value="environmental" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Leaf className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Environmental</span>
                                <span className="sm:hidden">Env</span>
                                <div className={`ml-2 w-2 h-2 rounded-full ${envStatus.color}`} title={`Environmental Processing: ${envStatus.label}`}></div>
                            </TabsTrigger>
                            <TabsTrigger value="advanced-war" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <ShieldAlert className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Advanced War</span>
                                <span className="sm:hidden">Advanced</span>
                            </TabsTrigger>
                            <TabsTrigger value="turn-processor" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Turn Processor</span>
                                <span className="sm:hidden">Turns</span>
                            </TabsTrigger>
                            <TabsTrigger value="wars" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Swords className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">War Management</span>
                                <span className="sm:hidden">Wars</span>
                            </TabsTrigger>
                            <TabsTrigger value="nations" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Globe className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Nations</span>
                                <span className="sm:hidden">Nations</span>
                            </TabsTrigger>
                            <TabsTrigger value="users" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <UserCog className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Users</span>
                                <span className="sm:hidden">Users</span>
                            </TabsTrigger>
                            <TabsTrigger value="alliances" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Alliances</span>
                                <span className="sm:hidden">Alliances</span>
                            </TabsTrigger>
                            <TabsTrigger value="marketplace" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Store className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Market</span>
                                <span className="sm:hidden">Market</span>
                            </TabsTrigger>
                            <TabsTrigger value="database" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Database className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Database</span>
                                <span className="sm:hidden">Database</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="general" className="mt-8">
                        <GeneralSettings config={gameConfig} onUpdate={handleConfigChange} />
                    </TabsContent>
                    <TabsContent value="battle-mechanics" className="mt-8">
                        <BattleMechanicsSettings config={gameConfig} onUpdate={handleConfigChange} />
                    </TabsContent>
                    <TabsContent value="war-rules" className="mt-8">
                        <WarRulesSettings config={gameConfig} onUpdate={handleConfigChange} />
                    </TabsContent>
                    <TabsContent value="unit-specs" className="mt-8">
                        <UnitSpecsSettings config={gameConfig} onUpdate={handleConfigChange} />
                    </TabsContent>
                    <TabsContent value="combat" className="mt-8">
                        <CombatSettings config={gameConfig} onUpdate={handleConfigChange} />
                    </TabsContent>
                    <TabsContent value="refined-resources" className="mt-8">
                        <RefinedResourceSettings config={gameConfig} onUpdate={handleConfigChange} />
                    </TabsContent>
                    <TabsContent value="power-plants" className="mt-8">
                        <PowerPlantSettings config={gameConfig} onUpdate={handleConfigChange} />
                    </TabsContent>
                    <TabsContent value="environmental" className="mt-8">
                        <EnvironmentalSettings config={gameConfig} onUpdate={handleConfigChange} gameState={gameState} onRefresh={loadData} />
                    </TabsContent>
                    <TabsContent value="advanced-war" className="mt-8">
                        <AdvancedWarSettings gameConfigEntity={gameConfigEntity} onUpdate={loadData} />
                    </TabsContent>
                    <TabsContent value="turn-processor" className="mt-8">
                        <ManualTurnProcessor gameState={gameState} onUpdate={loadData} />
                    </TabsContent>
                    <TabsContent value="wars" className="mt-8">
                        <WarManagementPanel onUpdate={loadData} />
                    </TabsContent>
                    <TabsContent value="nations" className="mt-8">
                        <NationManagement onUpdate={loadData} />
                    </TabsContent>
                    <TabsContent value="users" className="mt-8">
                        <UserManagement onUpdate={loadData} />
                    </TabsContent>
                    <TabsContent value="alliances" className="mt-8">
                        <AllianceManagement onUpdate={loadData} />
                    </TabsContent>
                    <TabsContent value="marketplace" className="mt-8">
                        <MarketplaceManagement onUpdate={loadData} />
                    </TabsContent>
                    <TabsContent value="database" className="mt-8">
                        <DatabaseReset onUpdate={loadData} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
