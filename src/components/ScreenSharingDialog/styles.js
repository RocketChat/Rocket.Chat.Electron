import styled from '@emotion/styled';

export const Wrapper = styled.dialog`
	z-index: 1000;
	top: 0;
	bottom: 0;
	display: flex;
	flex-direction: column;
	width: 90vw;
	max-height: 90vh;
	padding: 0.75rem;
	cursor: default;
	user-select: none;
	color: #444444;
	background-color: #F4F4F4;
	align-items: center;
	justify-content: center;
	overflow-y: auto;

	&:not([open]) {
		display: none;
	}
`;

export const Announcement = styled.h1`
	margin: 0 0 1rem;
	font-size: 1.5rem;
	line-height: normal;
`;

export const Sources = styled.div`
	display: flex;
	overflow-y: auto;
	width: 100%;
	align-items: stretch;
	flex-wrap: wrap;
	justify-content: center;
`;

export const Source = styled.div`
	display: flex;
	flex-direction: column;
	padding: 1rem;
	cursor: pointer;

	&:hover {
		background-color: #EAEAEA;
	}
`;

export const ThumbnailWrapper = styled.div`
	width: 150px;
`;

export const Thumbnail = styled.img``;

export const Name = styled.div`
	width: 150px;
	text-align: center;
`;
