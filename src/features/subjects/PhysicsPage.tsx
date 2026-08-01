import { SubjectDetailPage } from './SubjectDetailPage';

export function PhysicsPage() {
  return (
    <SubjectDetailPage
      subjectId="physics"
      subjectTitle="Physics"
      subjectSubtitle="Calibrate your understanding of physical laws, mechanics, and wave dynamics through rigorous quantitative practice and spaced recall drills."
      subjectIcon="Atom"
      unitCategories={['All', 'Mechanics', 'Electrodynamics', 'Optics & Waves']}
    />
  );
}
