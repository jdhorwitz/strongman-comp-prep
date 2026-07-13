export type EventCategory =
	| "press"
	| "carry"
	| "hold"
	| "deadlift"
	| "medley"
	| "other";
export type PrScope = "all-time" | "prep-cycle";

export type AthleteProfile = {
	name: string;
	age: number;
	heightInches: number;
	currentWeightLb?: number;
	targetClassLb: number;
	targetPreCutRangeLb: { minimum: number; maximum: number };
	prepCycleStartDate: string;
};

export type CompetitionEvent = {
	id: string;
	name: string;
	category: EventCategory;
	division: "masters-amateur";
	timeLimitSeconds?: number;
	distanceFt?: number;
	attempts?: number;
	rules: string[];
	allowedEquipment: string[];
	prohibitedEquipment?: string[];
	contestWeightLb?: number;
	currentBest?: string;
	target?: string;
	notes?: string;
};

export type Competition = {
	name: string;
	date: string;
	weighInDate: string;
	weighInWindow?: string;
	location: string;
	sourceUrl?: string;
	events: CompetitionEvent[];
};

export type BodyweightEntry = {
	id: string;
	date: string;
	weightLb: number;
	bodyFatPercent?: number;
	source?: string;
	notes?: string;
};
export type NutritionEntry = {
	id: string;
	date: string;
	calories: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	notes?: string;
};

export type TrainingSet = {
	id: string;
	weightLb?: number;
	reps?: number;
	rpe?: number;
	distanceFt?: number;
	timeSeconds?: number;
	holdSeconds?: number;
	completed?: boolean;
	notes?: string;
};

export type TrainingExercise = {
	id: string;
	name: string;
	eventCategory?: EventCategory;
	sets: TrainingSet[];
};
export type TrainingSession = {
	id: string;
	date: string;
	title?: string;
	sessionType?: string;
	exercises: TrainingExercise[];
	painNotes?: string;
	recoveryNotes?: string;
	notes?: string;
};

export type PainArea = { area: string; severity: number };
export type RecoveryEntry = {
	id: string;
	date: string;
	sleepHours?: number;
	recoveryScore?: number;
	fatigueScore?: number;
	stressScore?: number;
	painAreas?: PainArea[];
	mobilityWork?: string;
	readinessScore?: number;
	sleepScore?: number;
	activityScore?: number;
	steps?: number;
	restingHeartRate?: number;
	hrvMs?: number;
	respiratoryRate?: number;
	bodyTemperatureDeviation?: number;
	source?: string;
	notes?: string;
};

export type AppData = {
	schemaVersion: 1;
	profile: AthleteProfile;
	competition: Competition;
	bodyweightEntries: BodyweightEntry[];
	nutritionEntries: NutritionEntry[];
	trainingSessions: TrainingSession[];
	recoveryEntries: RecoveryEntry[];
};
