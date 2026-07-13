import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalPositive = z.number().nonnegative().optional();
const score = z.number().min(1).max(10).optional();

export const bodyweightEntrySchema = z.object({
	id: z.string(),
	date: dateString,
	weightLb: z.number().positive(),
	notes: z.string().optional(),
});
export const nutritionEntrySchema = z.object({
	id: z.string(),
	date: dateString,
	calories: z.number().nonnegative(),
	proteinG: z.number().nonnegative(),
	carbsG: z.number().nonnegative(),
	fatG: z.number().nonnegative(),
	notes: z.string().optional(),
});

export const trainingSetSchema = z.object({
	id: z.string(),
	weightLb: optionalPositive,
	reps: z.number().int().nonnegative().optional(),
	rpe: score,
	distanceFt: optionalPositive,
	timeSeconds: optionalPositive,
	holdSeconds: optionalPositive,
	completed: z.boolean().optional(),
	notes: z.string().optional(),
});
export const trainingExerciseSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	eventCategory: z
		.enum(["press", "carry", "hold", "deadlift", "medley", "other"])
		.optional(),
	sets: z.array(trainingSetSchema),
});
export const trainingSessionSchema = z.object({
	id: z.string(),
	date: dateString,
	title: z.string().optional(),
	sessionType: z.string().optional(),
	exercises: z.array(trainingExerciseSchema),
	painNotes: z.string().optional(),
	recoveryNotes: z.string().optional(),
	notes: z.string().optional(),
});

export const appDataSchema = z.object({
	schemaVersion: z.literal(1),
	profile: z.object({
		name: z.string(),
		age: z.number(),
		heightInches: z.number(),
		currentWeightLb: z.number().optional(),
		targetClassLb: z.number(),
		targetPreCutRangeLb: z.object({ minimum: z.number(), maximum: z.number() }),
		prepCycleStartDate: dateString,
	}),
	competition: z.object({
		name: z.string(),
		date: dateString,
		weighInDate: dateString,
		weighInWindow: z.string().optional(),
		location: z.string(),
		sourceUrl: z.string().optional(),
		events: z.array(
			z.object({
				id: z.string(),
				name: z.string(),
				category: z.enum([
					"press",
					"carry",
					"hold",
					"deadlift",
					"medley",
					"other",
				]),
				division: z.literal("masters-amateur"),
				timeLimitSeconds: z.number().optional(),
				distanceFt: z.number().optional(),
				attempts: z.number().optional(),
				rules: z.array(z.string()),
				allowedEquipment: z.array(z.string()),
				prohibitedEquipment: z.array(z.string()).optional(),
				contestWeightLb: z.number().optional(),
				currentBest: z.string().optional(),
				target: z.string().optional(),
				notes: z.string().optional(),
			}),
		),
	}),
	bodyweightEntries: z.array(bodyweightEntrySchema),
	nutritionEntries: z.array(nutritionEntrySchema),
	trainingSessions: z.array(trainingSessionSchema),
	recoveryEntries: z.array(
		z.object({
			id: z.string(),
			date: dateString,
			sleepHours: z.number().optional(),
			recoveryScore: score,
			fatigueScore: score,
			stressScore: score,
			painAreas: z
				.array(
					z.object({ area: z.string(), severity: z.number().min(1).max(10) }),
				)
				.optional(),
			mobilityWork: z.string().optional(),
			notes: z.string().optional(),
		}),
	),
});
