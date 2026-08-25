import { renderHook, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useAutosave } from './use-autosave';
import { PlayerEditableSchema } from '../[player]/player-editable-schema';

/**
 * Two regressions, both of which shipped and both of which only appear when the
 * page is actually rendered — a typecheck and a production build passed over
 * each of them.
 *
 * 1. `PlayerEditableSchema` was exported from a `'use server'` module. Next
 *    only keeps async function exports from those, so in the browser it was
 *    `undefined` and `Object.keys(undefined)` threw at import time.
 * 2. `useAutosave` read the form from `useFormContext()`, but it is called by
 *    the component that *renders* `<FormProvider>` — so there was no provider
 *    above it and the context was null.
 *
 * Neither needs a database or a logged-in session to catch, which is the point
 * of putting them here.
 */
describe('useAutosave', () => {
  it('has a schema to derive its field list from', () => {
    // Guards regression 1: if this module ever moves back behind 'use server',
    // `.shape` is undefined here exactly as it was in the browser.
    expect(PlayerEditableSchema?.shape).toBeDefined();
    expect(Object.keys(PlayerEditableSchema.shape).length).toBeGreaterThan(0);
  });

  it('mounts without a FormProvider above it', () => {
    // Guards regression 2. The hook is called by the form's owner, so there is
    // deliberately no provider here — mirroring FormWrapper.
    const { result } = renderHook(() => {
      const form = useForm({ defaultValues: { proofLink: '' } });

      return useAutosave({
        form: form as never,
        save: jest.fn().mockResolvedValue(true),
        onError: jest.fn(),
      });
    });

    expect(result.current.flushNow).toBeInstanceOf(Function);
  });

  it('sends nothing when nothing has changed', async () => {
    const save = jest.fn().mockResolvedValue(true);

    const { result } = renderHook(() => {
      const form = useForm({ defaultValues: { proofLink: 'https://a.test' } });

      return useAutosave({ form: form as never, save, onError: jest.fn() });
    });

    await result.current.flushNow();

    await waitFor(() => {
      expect(save).not.toHaveBeenCalled();
    });
  });

  it('sends a patch once a player-owned field changes', async () => {
    const save = jest.fn().mockResolvedValue(true);
    let setValue: (name: never, value: never) => void = jest.fn();

    const { result } = renderHook(() => {
      const form = useForm({ defaultValues: { proofLink: 'https://a.test' } });

      setValue = form.setValue as never;

      return useAutosave({ form: form as never, save, onError: jest.fn() });
    });

    setValue('proofLink' as never, 'https://b.test' as never);

    await result.current.flushNow();

    await waitFor(() => {
      expect(save).toHaveBeenCalledWith({ proofLink: 'https://b.test' });
    });
  });

  it('reports a write that did not land', async () => {
    const onError = jest.fn();
    let setValue: (name: never, value: never) => void = jest.fn();

    const { result } = renderHook(() => {
      const form = useForm({ defaultValues: { proofLink: '' } });

      setValue = form.setValue as never;

      return useAutosave({
        form: form as never,
        save: jest.fn().mockResolvedValue(false),
        onError,
      });
    });

    setValue('proofLink' as never, 'https://b.test' as never);

    await result.current.flushNow();

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });
});
