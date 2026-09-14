import { HttpError } from '../http.js';
import { selectExamQuestions } from '../exam-blueprints.js';
import { selectBianMathQuestions } from '../bian-math-assessment.js';
import { selectBianScienceQuestions } from '../bian-science-assessment.js';
import { selectBianBahasaIndonesiaQuestions } from '../bian-bahasa-indonesia-assessment.js';
import { selectBianPancasilaQuestions } from '../bian-pancasila-assessment.js';
import { selectBianPaibpQuestions } from '../bian-paibp-assessment.js';

const SELECTOR_ADAPTERS = Object.freeze({
  'legacy-exam-blueprints-v1': selectExamQuestions,
  'bian-math-v1': selectBianMathQuestions,
  'bian-science-v1': selectBianScienceQuestions,
  'bian-bahasa-indonesia-v1': selectBianBahasaIndonesiaQuestions,
  'bian-pancasila-v1': selectBianPancasilaQuestions,
  'bian-paibp-v1': selectBianPaibpQuestions,
});

export function selectionAdapterIds() {
  return Object.keys(SELECTOR_ADAPTERS);
}

export function selectAssessmentQuestions(questions, definition, blueprint) {
  const adapterId = String(definition?.selectionStrategy?.adapter || '').trim();
  const selector = SELECTOR_ADAPTERS[adapterId];
  if (!selector) {
    throw new HttpError(
      500,
      'ASSESSMENT_SELECTOR_INVALID',
      `Selection strategy Assessment tidak memiliki adapter yang terdaftar: ${adapterId || 'unknown'}.`,
    );
  }
  return selector(questions, blueprint);
}
