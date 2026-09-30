/**
 * Pruebas del cálculo de puntaje y prioridad.
 * Se ejecutan con: npm test
 *
 * Usan el corredor de pruebas que trae Node (node:test), sin dependencias extra.
 */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const { calculateScore, getPriority, evaluateApplication } = require('../src/domain/scoring');

/** Datos base que NO suman ningún punto; cada prueba cambia solo lo que necesita. */
const neutralInput = Object.freeze({
  candidateYears: 1,
  minYears: 3,
  source: 'JOB_BOARD',
  coverLetter: 'Carta breve sin palabras clave.',
  otherActiveApplications: 0,
});

/** Devuelve solo los nombres de las reglas aplicadas, para comparar fácil. */
const rulesOf = (result) => result.breakdown.map((item) => item.rule);

describe('calculateScore y prioridad', () => {
  test('caso del enunciado: REFERRAL + experiencia + palabras clave = 9, TOP', () => {
    const result = evaluateApplication({
      candidateYears: 4,
      minYears: 3,
      source: 'REFERRAL',
      coverLetter: 'I have four years of experience building REST APIs with Node.js and SQL databases',
      otherActiveApplications: 0,
    });

    assert.equal(result.score, 9);
    assert.equal(result.priority, 'TOP');
    assert.deepEqual(rulesOf(result), ['MEETS_MIN_EXPERIENCE', 'SOURCE_REFERRAL', 'COVER_LETTER_KEYWORDS']);
  });

  test('caso máximo: todas las bonificaciones suman 10', () => {
    const result = calculateScore({
      candidateYears: 5,
      minYears: 3,
      source: 'REFERRAL',
      coverLetter: 'Experiencia con Node y SQL. '.repeat(20), // más de 500 caracteres
      otherActiveApplications: 0,
    });

    assert.equal(result.score, 10);
    assert.equal(getPriority(result.score), 'TOP');
  });

  test('experiencia igual al mínimo (con decimales) suma +4', () => {
    const result = calculateScore({ ...neutralInput, candidateYears: 2.5, minYears: 2.5 });
    assert.equal(result.score, 4);

    const below = calculateScore({ ...neutralInput, candidateYears: 2.4, minYears: 2.5 });
    assert.equal(below.score, 0);
  });

  test('INTERNAL suma +2 y OTHER no suma', () => {
    assert.equal(calculateScore({ ...neutralInput, source: 'INTERNAL' }).score, 2);
    assert.equal(calculateScore({ ...neutralInput, source: 'OTHER' }).score, 0);
  });

  test('penalización: 3 activas en otras vacantes restan 2; con 2 no se resta', () => {
    const withThree = calculateScore({ ...neutralInput, otherActiveApplications: 3 });
    assert.equal(withThree.score, -2);
    assert.deepEqual(rulesOf(withThree), ['MANY_ACTIVE_APPLICATIONS']);

    const withTwo = calculateScore({ ...neutralInput, otherActiveApplications: 2 });
    assert.equal(withTwo.score, 0);
  });

  test('carta de exactamente 500 caracteres no suma; de 501 sí suma +1', () => {
    const exactly500 = calculateScore({ ...neutralInput, coverLetter: 'a'.repeat(500) });
    assert.equal(exactly500.score, 0);

    const has501 = calculateScore({ ...neutralInput, coverLetter: 'a'.repeat(501) });
    assert.equal(has501.score, 1);
  });

  test('palabras clave: sin distinguir mayúsculas y sin falsos positivos', () => {
    const scoreFor = (coverLetter) => calculateScore({ ...neutralInput, coverLetter }).score;

    assert.equal(scoreFor('Trabajo con NODE a diario'), 2);
    assert.equal(scoreFor('Administro bases MySQL y PostgreSQL'), 2);
    assert.equal(scoreFor('Diseñé varias APIs'), 2);
    assert.equal(scoreFor('Nací en la capital y aprendo rápido: rapid learner'), 0);
  });

  test('límites de prioridad: 7 TOP, 5-6 HIGH, 3-4 MEDIUM, 2 o menos LOW', () => {
    const expected = [
      [10, 'TOP'], [7, 'TOP'],
      [6, 'HIGH'], [5, 'HIGH'],
      [4, 'MEDIUM'], [3, 'MEDIUM'],
      [2, 'LOW'], [0, 'LOW'], [-2, 'LOW'],
    ];

    for (const [score, priority] of expected) {
      assert.equal(getPriority(score), priority, `puntaje ${score} debería ser ${priority}`);
    }
  });
});
