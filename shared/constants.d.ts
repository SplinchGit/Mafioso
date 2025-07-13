export declare const RANKS: readonly [{
    readonly id: 0;
    readonly name: "Beggar";
    readonly requiredRespect: 0;
}, {
    readonly id: 1;
    readonly name: "Bum";
    readonly requiredRespect: 100;
}, {
    readonly id: 2;
    readonly name: "Thief";
    readonly requiredRespect: 500;
}, {
    readonly id: 3;
    readonly name: "Dealer";
    readonly requiredRespect: 2500;
}, {
    readonly id: 4;
    readonly name: "Bookie";
    readonly requiredRespect: 7500;
}, {
    readonly id: 5;
    readonly name: "Thug";
    readonly requiredRespect: 25000;
}, {
    readonly id: 6;
    readonly name: "Killer";
    readonly requiredRespect: 100000;
}, {
    readonly id: 7;
    readonly name: "Bodyguard";
    readonly requiredRespect: 350000;
}, {
    readonly id: 8;
    readonly name: "Smuggler";
    readonly requiredRespect: 750000;
}, {
    readonly id: 9;
    readonly name: "Wheelman";
    readonly requiredRespect: 2000000;
}, {
    readonly id: 10;
    readonly name: "Hitman";
    readonly requiredRespect: 6500000;
}, {
    readonly id: 11;
    readonly name: "Associate";
    readonly requiredRespect: 25000000;
}, {
    readonly id: 12;
    readonly name: "Soldier";
    readonly requiredRespect: 100000000;
}, {
    readonly id: 13;
    readonly name: "Enforcer";
    readonly requiredRespect: 500000000;
}, {
    readonly id: 14;
    readonly name: "Capo";
    readonly requiredRespect: 1500000000;
}, {
    readonly id: 15;
    readonly name: "Underboss";
    readonly requiredRespect: 10000000000;
}, {
    readonly id: 16;
    readonly name: "Consigliere";
    readonly requiredRespect: 35000000000;
}, {
    readonly id: 17;
    readonly name: "Boss";
    readonly requiredRespect: 100000000000;
}, {
    readonly id: 18;
    readonly name: "Godfather";
    readonly requiredRespect: 500000000000;
}, {
    readonly id: 19;
    readonly name: "Mafioso";
    readonly requiredRespect: 1000000000000;
}];
export declare const CITIES: readonly [{
    readonly id: 0;
    readonly name: "London";
    readonly flag: "🇬🇧";
}, {
    readonly id: 1;
    readonly name: "Tokyo";
    readonly flag: "🇯🇵";
}, {
    readonly id: 2;
    readonly name: "New York";
    readonly flag: "🇺🇸";
}, {
    readonly id: 3;
    readonly name: "Moscow";
    readonly flag: "🇷🇺";
}, {
    readonly id: 4;
    readonly name: "Palermo";
    readonly flag: "🇮🇹";
}];
export declare const CRIMES: readonly [{
    readonly id: 0;
    readonly name: "Pickpocket";
    readonly description: "Steal from unsuspecting victims";
    readonly baseSuccess: 95;
    readonly basePayout: {
        readonly min: 50;
        readonly max: 200;
    };
    readonly baseRespect: 1;
    readonly requiredRank: 0;
    readonly cooldown: 30;
    readonly nerve: 1;
}, {
    readonly id: 1;
    readonly name: "Shoplift";
    readonly description: "Steal small items from stores";
    readonly baseSuccess: 90;
    readonly basePayout: {
        readonly min: 100;
        readonly max: 500;
    };
    readonly baseRespect: 2;
    readonly requiredRank: 0;
    readonly cooldown: 60;
    readonly nerve: 2;
}, {
    readonly id: 2;
    readonly name: "Mug Someone";
    readonly description: "Rob someone at gunpoint";
    readonly baseSuccess: 85;
    readonly basePayout: {
        readonly min: 500;
        readonly max: 2000;
    };
    readonly baseRespect: 5;
    readonly requiredRank: 2;
    readonly cooldown: 120;
    readonly nerve: 3;
}, {
    readonly id: 3;
    readonly name: "Break & Enter";
    readonly description: "Rob a house when the owners are away";
    readonly baseSuccess: 75;
    readonly basePayout: {
        readonly min: 2000;
        readonly max: 10000;
    };
    readonly baseRespect: 15;
    readonly requiredRank: 3;
    readonly cooldown: 300;
    readonly nerve: 5;
}, {
    readonly id: 4;
    readonly name: "Car Theft";
    readonly description: "Steal and sell expensive cars";
    readonly baseSuccess: 70;
    readonly basePayout: {
        readonly min: 10000;
        readonly max: 50000;
    };
    readonly baseRespect: 35;
    readonly requiredRank: 5;
    readonly cooldown: 600;
    readonly nerve: 8;
}, {
    readonly id: 5;
    readonly name: "Drug Deal";
    readonly description: "Sell drugs on the street";
    readonly baseSuccess: 65;
    readonly basePayout: {
        readonly min: 25000;
        readonly max: 100000;
    };
    readonly baseRespect: 75;
    readonly requiredRank: 7;
    readonly cooldown: 900;
    readonly nerve: 12;
}, {
    readonly id: 6;
    readonly name: "Armed Robbery";
    readonly description: "Rob a convenience store";
    readonly baseSuccess: 60;
    readonly basePayout: {
        readonly min: 75000;
        readonly max: 250000;
    };
    readonly baseRespect: 150;
    readonly requiredRank: 9;
    readonly cooldown: 1200;
    readonly nerve: 15;
}, {
    readonly id: 7;
    readonly name: "Kidnapping";
    readonly description: "Kidnap someone for ransom";
    readonly baseSuccess: 50;
    readonly basePayout: {
        readonly min: 500000;
        readonly max: 2000000;
    };
    readonly baseRespect: 500;
    readonly requiredRank: 12;
    readonly cooldown: 1800;
    readonly nerve: 25;
}, {
    readonly id: 8;
    readonly name: "Bank Heist";
    readonly description: "Rob a major bank";
    readonly baseSuccess: 40;
    readonly basePayout: {
        readonly min: 2000000;
        readonly max: 10000000;
    };
    readonly baseRespect: 1500;
    readonly requiredRank: 15;
    readonly cooldown: 3600;
    readonly nerve: 40;
}, {
    readonly id: 9;
    readonly name: "Casino Heist";
    readonly description: "Rob a high-end casino";
    readonly baseSuccess: 30;
    readonly basePayout: {
        readonly min: 10000000;
        readonly max: 50000000;
    };
    readonly baseRespect: 5000;
    readonly requiredRank: 17;
    readonly cooldown: 7200;
    readonly nerve: 60;
}, {
    readonly id: 10;
    readonly name: "Government Heist";
    readonly description: "Rob the federal reserve";
    readonly baseSuccess: 20;
    readonly basePayout: {
        readonly min: 50000000;
        readonly max: 500000000;
    };
    readonly baseRespect: 25000;
    readonly requiredRank: 19;
    readonly cooldown: 14400;
    readonly nerve: 100;
}];
export declare const CARS: readonly [{
    readonly id: 0;
    readonly name: "Fiat 500";
    readonly price: 15000;
    readonly speed: 45;
    readonly accel: 30;
}, {
    readonly id: 1;
    readonly name: "Ford Focus";
    readonly price: 25000;
    readonly speed: 55;
    readonly accel: 40;
}, {
    readonly id: 2;
    readonly name: "Honda Civic";
    readonly price: 35000;
    readonly speed: 65;
    readonly accel: 50;
}, {
    readonly id: 3;
    readonly name: "BMW 3 Series";
    readonly price: 55000;
    readonly speed: 75;
    readonly accel: 65;
}, {
    readonly id: 4;
    readonly name: "Audi A4";
    readonly price: 65000;
    readonly speed: 80;
    readonly accel: 70;
}, {
    readonly id: 5;
    readonly name: "Mercedes C-Class";
    readonly price: 75000;
    readonly speed: 85;
    readonly accel: 75;
}, {
    readonly id: 6;
    readonly name: "Porsche 911";
    readonly price: 150000;
    readonly speed: 95;
    readonly accel: 90;
}, {
    readonly id: 7;
    readonly name: "Ferrari 458";
    readonly price: 300000;
    readonly speed: 98;
    readonly accel: 95;
}, {
    readonly id: 8;
    readonly name: "Lamborghini Huracán";
    readonly price: 400000;
    readonly speed: 99;
    readonly accel: 97;
}, {
    readonly id: 9;
    readonly name: "Bugatti Veyron";
    readonly price: 2000000;
    readonly speed: 100;
    readonly accel: 98;
}, {
    readonly id: 10;
    readonly name: "Ferrari LaFerrari";
    readonly price: 5000000;
    readonly speed: 100;
    readonly accel: 100;
}];
export declare const GAME_CONFIG: {
    readonly STARTING_MONEY: 1000;
    readonly STARTING_RESPECT: 0;
    readonly STARTING_NERVE: 100;
    readonly MAX_NERVE: 100;
    readonly NERVE_REGEN_RATE: 1;
    readonly JAIL_TIME_BASE: 300;
    readonly HOSPITAL_TIME_BASE: 180;
    readonly TRAVEL_COST_BASE: 1000;
    readonly TRAVEL_TIME: 60;
};
export declare const CRIME_OUTCOMES: {
    readonly SUCCESS: "success";
    readonly FAILURE: "failure";
    readonly JAIL: "jail";
    readonly HOSPITAL: "hospital";
};
export type CrimeOutcome = typeof CRIME_OUTCOMES[keyof typeof CRIME_OUTCOMES];
export type RankType = typeof RANKS[number];
export type CityType = typeof CITIES[number];
export type CrimeType = typeof CRIMES[number];
export type CarType = typeof CARS[number];
//# sourceMappingURL=constants.d.ts.map