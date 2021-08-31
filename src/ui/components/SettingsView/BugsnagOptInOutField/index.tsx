import { ToggleSwitch, Field } from '@rocket.chat/fuselage';
import React, { FC, useEffect } from 'react';
// import { getElectronStore } from '../../../../app/main/persistence';

export const BugsangOptInOutField: FC = () => (
  // const [str, setStr] = useState<string>('');
  // useEffect(() => {
  // const electronStore = getElectronStore();
  // const s = JSON.stringify(electronStore) || 'NOP';
  // alert(s);
  // setStr(s);
  // }, []);
  // {str}

  <>
    <Field>
      <Field.Row>
        <ToggleSwitch onChange={() => null} />
        <Field.Label htmlFor='toggle-switch'>
          Enable bugsnag monitoring (client only)
        </Field.Label>
      </Field.Row>
    </Field>
  </>
);
