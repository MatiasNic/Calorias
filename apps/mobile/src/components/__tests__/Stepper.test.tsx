import { fireEvent, render, screen } from '@testing-library/react-native';

import { Stepper } from '../Stepper';

describe('Stepper', () => {
  it('increments and decrements by step', async () => {
    const onChange = jest.fn();
    await render(<Stepper label="Gramos" value={100} step={10} onChange={onChange} unit="g" />);
    await fireEvent.press(screen.getByLabelText('+ 10'));
    await fireEvent.press(screen.getByLabelText('− 10'));
    expect(onChange).toHaveBeenNthCalledWith(1, 110);
    expect(onChange).toHaveBeenNthCalledWith(2, 90);
  });

  it('clamps to min and max', async () => {
    const onChange = jest.fn();
    await render(
      <Stepper label="Gramos" value={5} step={10} min={0} max={8} onChange={onChange} />,
    );
    await fireEvent.press(screen.getByLabelText('+ 10'));
    expect(onChange).toHaveBeenCalledWith(8);
  });
});
