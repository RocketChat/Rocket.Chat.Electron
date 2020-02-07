import styled from '@emotion/styled';

export const Wrapper = styled.div`
	overflow: hidden;
	width: 100vw;
	height: 100vh;
	cursor: default;
	user-select: none;
	background-color: #2f343d;
`;

export const WindowDragBar = styled.div`
	position: fixed;
	width: 100%;
	height: 22px;
	-webkit-app-region: drag;
`;
