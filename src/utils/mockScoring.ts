export function calculateMockScorePercent(input: {
  totalScore: number;
  totalQuestions?: number;
  totalMarks?: number;
  testSnapshot?: { totalMarks?: number };
}): number {
  const totalMarks = input.totalMarks ?? input.testSnapshot?.totalMarks ?? 0;
  const denominator = totalMarks > 0 ? totalMarks : (input.totalQuestions && input.totalQuestions > 0 ? input.totalQuestions * 4 : 0);

  if (!denominator || !Number.isFinite(input.totalScore)) {
    return 0;
  }

  return Math.round((input.totalScore / denominator) * 100);
}
