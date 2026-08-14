import { SubjectDetailPage } from './SubjectDetailPage';

export function ChemistryPage() {
  return (
    <SubjectDetailPage
      subjectId="chemistry"
      subjectTitle="Chemistry"
      subjectSubtitle="Master molecular structures, organic synthesis pathways, equilibrium dynamics, and transition metallurgy through systematic diagnostic testing."
      subjectIcon="FlaskConical"
      unitCategories={['All', 'Physical', 'Inorganic', 'Organic']}
    />
  );
}
