import type { ExerciseRequestDto } from "@sergiomesasyelamos2000/shared";

type ExerciseWithAltImage = ExerciseRequestDto & {
  image?: string | null;
  gifUrl?: string | null;
  giftUrl?: string | null;
};

const isValidImageValue = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function normalizeExerciseImage<T extends ExerciseWithAltImage>(
  exercise: T
): T {
  const currentImageUrl = exercise.imageUrl;

  if (isValidImageValue(currentImageUrl)) {
    return exercise;
  }

  const gifUrl = isValidImageValue(exercise.giftUrl)
    ? exercise.giftUrl.trim()
    : isValidImageValue(exercise.gifUrl)
      ? exercise.gifUrl.trim()
      : "";

  if (gifUrl) {
    return {
      ...exercise,
      imageUrl: gifUrl,
    };
  }

  const rawImage = isValidImageValue(exercise.image) ? exercise.image.trim() : "";

  if (!rawImage) {
    return exercise;
  }

  const normalizedImage = rawImage.startsWith("data:image")
    ? rawImage
    : `data:image/jpeg;base64,${rawImage}`;

  return {
    ...exercise,
    imageUrl: normalizedImage,
  };
}

export function normalizeExercisesImage<T extends ExerciseWithAltImage>(
  exercises: T[]
): T[] {
  return exercises.map(normalizeExerciseImage);
}
