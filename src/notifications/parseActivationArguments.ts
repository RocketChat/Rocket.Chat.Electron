export type ParsedActivationArguments = {
  type?: string;
  tag?: string;
};

export const parseActivationArguments = (
  rawArguments: string | undefined
): ParsedActivationArguments => {
  if (!rawArguments) {
    return {};
  }

  try {
    const params = new URLSearchParams(rawArguments);
    return {
      type: params.get('type') ?? undefined,
      tag: params.get('tag') ?? undefined,
    };
  } catch (error) {
    return {};
  }
};
