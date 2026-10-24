import test from 'node:test';
import assert from 'node:assert/strict';
import { load, ALL } from './load.js';

const T = load(ALL);

// Build a fake fiber tree: makeFiber(props, stateNode, ...children)
function fiber(extra, ...children) {
	const node = Object.assign({ child: null, sibling: null, stateNode: null, pendingProps: {}, memoizedProps: {} }, extra);
	let prev = null;
	for (const c of children) {
		c.return = node;
		if ( prev ) prev.sibling = c; else node.child = c;
		prev = c;
	}
	return node;
}

test('searchNode finds the redux store like FFZ', () => {
	const store = { getState: () => ({ ui: { rightColumnExpanded: true } }) };
	const tree = fiber({}, fiber({}), fiber({}, fiber({ pendingProps: { store } })));
	const found = T.tpmSearchNode(tree, n => n?.pendingProps?.store?.getState);
	assert.equal(found.pendingProps.store, store);
});

test('searchTree matches on stateNode (router history)', () => {
	const history = { location: { pathname: '/x', state: null } };
	const tree = fiber({}, fiber({ stateNode: { props: {} } }), fiber({ stateNode: { props: { history } } }));
	assert.equal(T.tpmSearchTree(tree, n => n?.props?.history).props.history, history);
});

test('depth limit mirrors FFZ (depth > max stops)', () => {
	let leaf = fiber({ pendingProps: { target: true } });
	let node = leaf;
	for (let i = 0; i < 16; i++) node = fiber({}, node);
	// leaf is at depth 16 from root: not found with max 15, found with 16
	assert.equal(T.tpmSearchNode(node, n => n.pendingProps.target, 15), null);
	assert.equal(T.tpmSearchNode(node, n => n.pendingProps.target, 16), leaf);
});

test('long sibling lists do not consume depth', () => {
	const kids = Array.from({ length: 50 }, () => fiber({}));
	kids[49].pendingProps = { target: true };
	const tree = fiber({}, ...kids);
	assert.equal(T.tpmSearchNode(tree, n => n.pendingProps.target), kids[49]);
});

test('criteria errors are swallowed', () => {
	const tree = fiber({}, fiber({}));
	assert.equal(T.tpmSearchNode(tree, () => { throw new Error('x'); }), null);
});

test('findAllInstances collects resize detectors anywhere in the tree', () => {
	const mk = () => ({ maybeDebounceOnScroll() {}, setGrowDivRef() {}, props: { onResize() {} }, onScroll() {} });
	const a = mk(), b = mk();
	let deep = fiber({ stateNode: b });
	for (let i = 0; i < 40; i++) deep = fiber({}, deep);
	const tree = fiber({}, fiber({ stateNode: a }), deep, fiber({ stateNode: { props: {} } }));
	const found = T.tpmFindAllInstances(tree, n => n.maybeDebounceOnScroll && n.setGrowDivRef && n.props?.onResize);
	assert.equal(found.length, 2);
	assert.ok(found.includes(a) && found.includes(b));
});

test('getReactInstance reads the __reactFiber$ expando', () => {
	const f = fiber({});
	const el = { ['__reactFiber$abc123']: f };
	assert.equal(T.tpmGetReactInstance(el), f);
	assert.equal(T.tpmGetReactInstance({}), null);
	assert.equal(T.tpmGetReactInstance(null), null);
});
