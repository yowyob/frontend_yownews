'use client';
import RedacteurRequestsModeration from '../RedacteurRequestsModeration';

// L'onglet « Validation de contenu » a été retiré : les contenus sont publiés
// directement par le rédacteur une fois sa newsletter validée.
export default function RedacteursWorkspace() {
  return <RedacteurRequestsModeration />;
}
