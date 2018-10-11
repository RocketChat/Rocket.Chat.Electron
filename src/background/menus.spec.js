/* eslint-env node, mocha */
import { Menu } from 'electron';
import { expect } from 'chai';
import sinon from 'sinon';
import menus from './menus';

describe('menus', () => {
	let menu;

	beforeEach(async() => {
		await menus.update();
		menu = Menu.getApplicationMenu();
	});

	it('should be the application menu', () => {
		expect(menu.items).to.not.be.empty;
	});

	it('should update on set state', () => {
		sinon.spy(menus, 'update');
		menus.setState({});
		expect(menus.update.calledOnce).to.be.true;
	});

	const itShouldHaveAnItem = (id, which) => it(`should have an item "${ id }"`, () => {
		const item = menus.getItem(id);
		expect(item).to.not.be.null;
		which && which(item);
	});

	itShouldHaveAnItem('quit', (item) => {
		const spy = sinon.spy();
		menus.on('quit', spy);
		item.click();
		expect(spy.called).to.be.true;
	});

	itShouldHaveAnItem('about', (item) => {
		const spy = sinon.spy();
		menus.on('about', spy);
		item.click();
		expect(spy.called).to.be.true;
	});
});
