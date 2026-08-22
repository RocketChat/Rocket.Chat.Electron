import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

import { ToggleField } from './ToggleField';

describe('ToggleField', () => {
  it('renders label, description, and checked toggle', () => {
    render(
      <ToggleField
        id='toggle-field'
        label='Label text'
        description='Description text'
        checked
        onChange={jest.fn()}
      />
    );

    expect(screen.getByText('Label text')).toBeInTheDocument();
    expect(screen.getByText('Description text')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('renders optional hint and children', () => {
    render(
      <ToggleField
        id='toggle-field-hint'
        label='Label'
        description='Description'
        hint='Hint text'
        checked={false}
        onChange={jest.fn()}
      >
        <span>Child content</span>
      </ToggleField>
    );

    expect(screen.getByText('Hint text')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('invokes onChange when toggled', () => {
    const onChange = jest.fn();
    render(
      <ToggleField
        id='toggle-field-change'
        label='Label'
        description='Description'
        checked={false}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalled();
  });

  it('respects disabled prop', () => {
    render(
      <ToggleField
        id='toggle-field-disabled'
        label='Label'
        description='Description'
        checked={false}
        onChange={jest.fn()}
        disabled
      />
    );

    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});
