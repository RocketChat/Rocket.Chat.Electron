import { css } from '@emotion/core';
import styled from '@emotion/styled';
import { FC } from 'react';

type WrapperProps = {
  visible: boolean;
};

export const Wrapper: FC<WrapperProps> = styled.section`
	background-color: white;
	height: 100%;
	display: flex;
	flex-direction: column;

	overflow-y: auto;
	justify-content: flex-start;

	${ ({ visible }) => css`display: ${ visible ? 'flex' : 'none' };` };
`;

export const Content: FC = styled.div`
	position: relative;
	top: 10%;
	width: 100%;
	max-width: 100%;
	display: flex;
	justify-content: center;
`;
