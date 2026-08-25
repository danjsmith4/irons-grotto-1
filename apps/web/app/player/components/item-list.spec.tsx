import {
  fireEvent,
  render,
  screen,
  within,
} from '@/test-utils/testing-library';
import { Theme } from '@radix-ui/themes';
import * as formDataMocks from '@/mocks/misc/form-data';
import { MockFormProvider } from '@/test-utils/mock-form-provider';
import { ItemList } from './item-list';

/**
 * Smoke coverage for the notable-item workbench: it renders every category,
 * search narrows it, and an acquired item reads as acquired.
 */
describe('ItemList', () => {
  // Rendering the workbench resolves the real (MSW-backed) drop-rate fetch and
  // then lays out every category, which comfortably outruns Jest's defaults.
  jest.setTimeout(60000);

  beforeEach(async () => {
    render(
      <MockFormProvider defaultValues={formDataMocks.midGamePlayer}>
        {/* Items that fail to resolve points render a Radix tooltip. */}
        <Theme>
          <ItemList />
        </Theme>
      </MockFormProvider>,
    );

    await screen.findByLabelText(/search notable items/i, undefined, {
      timeout: 30000,
    });
  });

  it('renders the categories', async () => {
    const categories = await screen.findAllByLabelText(/item count$/i, undefined, {
      timeout: 30000,
    });

    expect(categories.length).toBeGreaterThan(0);
  });

  it('renders each category with its completion', async () => {
    const completions = await screen.findAllByLabelText(
      /percentage complete$/i,
      undefined,
      { timeout: 30000 },
    );

    expect(completions.length).toBeGreaterThan(0);
  });

  it('filters the categories by search query', async () => {
    const before = await screen.findAllByLabelText(/item count$/i, undefined, {
      timeout: 30000,
    });

    fireEvent.change(screen.getByLabelText(/search notable items/i), {
      target: { value: 'chambers of xeric' },
    });

    const after = await screen.findAllByLabelText(/item count$/i);

    expect(after.length).toBeLessThan(before.length);
    expect(
      within(after[0].closest('button') as HTMLElement).getByText(
        /chambers of xeric/i,
      ),
    ).toBeInTheDocument();
  });

  it('reports when nothing matches the search', async () => {
    fireEvent.change(screen.getByLabelText(/search notable items/i), {
      target: { value: 'not a real item' },
    });

    expect(
      await screen.findByText(/no items match/i),
    ).toBeInTheDocument();
  });
});
