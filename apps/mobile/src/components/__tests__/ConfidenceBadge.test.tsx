import { render, screen } from '@testing-library/react-native';

import { ConfidenceBadge } from '../ConfidenceBadge';

describe('ConfidenceBadge', () => {
  it.each([
    [0.95, 'Confianza alta'],
    [0.6, 'Confianza media'],
    [0.2, 'Confianza baja'],
  ])('shows the level for %s', async (confidence, label) => {
    await render(<ConfidenceBadge confidence={confidence} />);
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByLabelText(`Nivel de confianza de la IA: ${label}`)).toBeTruthy();
  });
});
