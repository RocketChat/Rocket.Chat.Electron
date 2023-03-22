import styled from '@emotion/styled';
import { Tile } from '@rocket.chat/fuselage';

export const Source = styled(Tile)`
  cursor: pointer;
  width: 180px;
  height: 200px;
  overflow: hidden;
  text-align: center;

  &:hover {
    background-color: #eaeaea;
  }
`;
