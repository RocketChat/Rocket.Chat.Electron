import { render, screen } from '../../ui/test-utils';
import { PerformanceSection } from './PerformanceSection';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

let mockIsDarwin = false;

jest.mock('../../ui/windowChrome/appearance', () => ({
  get isDarwin() {
    return mockIsDarwin;
  },
}));

jest.mock(
  '../../ui/components/SettingsView/features/HardwareAcceleration',
  () => ({
    HardwareAcceleration: () => <div data-testid='hardware-acceleration' />,
  })
);

jest.mock(
  '../../ui/components/SettingsView/features/TransparentWindow',
  () => ({
    TransparentWindow: () => <div data-testid='transparent-window' />,
  })
);

describe('PerformanceSection', () => {
  afterEach(() => {
    mockIsDarwin = false;
  });

  it('shows hardware acceleration and the transparent window effect on macOS', () => {
    mockIsDarwin = true;

    render(<PerformanceSection />);

    expect(screen.getByTestId('hardware-acceleration')).toBeInTheDocument();
    expect(screen.getByTestId('transparent-window')).toBeInTheDocument();
  });

  it('explains what the section is for', () => {
    render(<PerformanceSection />);

    expect(
      screen.getByText('settings.performanceDescription')
    ).toBeInTheDocument();
  });

  it('shows only hardware acceleration on Windows and Linux', () => {
    render(<PerformanceSection />);

    expect(screen.getByTestId('hardware-acceleration')).toBeInTheDocument();
    expect(screen.queryByTestId('transparent-window')).not.toBeInTheDocument();
  });
});
