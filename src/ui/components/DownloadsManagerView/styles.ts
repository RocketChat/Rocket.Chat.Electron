import { css } from '@emotion/core';
import styled from '@emotion/styled';
import { Box, BoxProps } from '@rocket.chat/fuselage';
import { FC } from 'react';

type WrapperProps = {
  isVisible: boolean;
};

export const Wrapper: FC<WrapperProps> = styled.section`
	background-color: white;
	height: 100%;
	display: flex;
	flex-direction: column;

	overflow-y: auto;
	justify-content: flex-start;

	${ ({ isVisible }) => css`display: ${ isVisible ? 'flex' : 'none' };` };
`;

export const Content: FC = styled.div`
	position: relative;
	top: 10%;
	width: 100%;
	max-width: 100%;
	display: flex;
	justify-content: center;
`;

export type ClickableLinkProps = BoxProps & {
  isRemove?: boolean;
};

export const ClickableLink: FC<ClickableLinkProps> = styled(Box)`
	cursor: pointer;

	&:hover,
	&:focus {
		${ ({ isRemove }) => css`color: ${ !isRemove ? '#2F343D' : '#F5455C' };` };
	}
`;
