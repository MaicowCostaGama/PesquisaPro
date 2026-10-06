function score({responses, integrity, duration, distance}) {
  return responses * 0.30 + integrity * 0.30 + duration * 0.20 + distance * 0.20;
}

const result = score({responses: 90, integrity: 80, duration: 70, distance: 60});
if (Math.abs(result - 77) > 1e-9) throw new Error('Fórmula de ranking incorreta');
if (Math.abs((0.30 + 0.30 + 0.20 + 0.20) - 1) > 1e-9) throw new Error('Pesos não totalizam 100%');
console.log('researcher-ranking-formula-smoke-test: OK');
