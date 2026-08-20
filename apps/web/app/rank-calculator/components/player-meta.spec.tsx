import { render, screen } from '@/test-utils/testing-library';
import * as formDataMocks from '@/mocks/misc/form-data';
import { MockFormProvider } from '@/test-utils/mock-form-provider';
import { generatePlayerTests } from '@/test-utils/generate-player-tests';
import { format } from 'date-fns';
import { calculateScaling } from '../utils/calculators/calculate-scaling';
import { PlayerMeta } from './player-meta';
import { formatPercentage } from '../utils/format-percentage';

generatePlayerTests(formDataMocks, (formData) => {
  beforeEach(async () => {
    render(
      <MockFormProvider defaultValues={formData}>
        <PlayerMeta />
      </MockFormProvider>,
    );

    await screen.findByLabelText(/join date/i);
  });

  it('renders the join date', () => {
    expect(screen.getByLabelText(/join date/i).textContent).toBe(
      format(formData.joinDate, 'dd MMM yyyy'),
    );
  });

  it('renders the point scaling value', () => {
    const scaling = calculateScaling(formData.joinDate);

    expect(screen.getByLabelText(/point scaling/i).textContent).toBe(
      formatPercentage(scaling),
    );
  });
});
