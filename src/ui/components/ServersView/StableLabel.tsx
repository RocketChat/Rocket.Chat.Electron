import { Box } from '@rocket.chat/fuselage';

type StableLabelProps = {
  label: string;
  alternatives: string[];
};

// Gives a button the width of its widest label, so the buttons next to it do
// not move when the label changes. The other labels stay in the layout but
// are hidden, and hidden text is not part of the accessible name.
const StableLabel = ({ label, alternatives }: StableLabelProps) => (
  <Box is='span' display='inline-grid'>
    {[...new Set([label, ...alternatives])].map((text) => (
      <Box
        is='span'
        key={text}
        aria-hidden={text === label ? undefined : true}
        style={{
          gridArea: '1 / 1',
          justifySelf: 'center',
          fontVariantNumeric: 'tabular-nums',
          visibility: text === label ? 'visible' : 'hidden',
        }}
      >
        {text}
      </Box>
    ))}
  </Box>
);

export default StableLabel;
