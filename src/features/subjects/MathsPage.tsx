import { SubjectDetailPage } from './SubjectDetailPage';

export function MathsPage() {
  return (
    <SubjectDetailPage
      subjectId="maths"
      subjectTitle="Mathematics"
      subjectSubtitle="Solidify your analytical rigour, geometric proofs, calculus limits, and algebraic modeling with intensive multi-conceptual problem drill sets."
      subjectIcon="Binary"
      unitCategories={['All', 'Algebra', 'Geometry', 'Calculus']}
    />
  );
}
