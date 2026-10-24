'use strict';

// Minimal port of FrankerFaceZ's "Fine" React helpers.
//
// Content scripts see page objects through Xray wrappers, which hide the
// expando properties React stores on DOM nodes. Firefox's documented
// `wrappedJSObject` waives that, giving access to the same objects FFZ
// reads from the page. Waivers are transitive, so everything reached from
// a waived object is also waived.

function tpmWaive(obj) {
	return (obj && obj.wrappedJSObject) || obj;
}

function tpmFindAccessor(node, prefix) {
	for (const key in node) {
		if ( prefix ? key.startsWith(`${prefix}$`) : (key.startsWith('__reactInternalInstance$') || key.startsWith('__reactFiber$')) )
			return key;
	}
	return null;
}

// Fine.getReactInstance
function tpmGetReactInstance(element) {
	if ( ! element )
		return null;

	const node = tpmWaive(element);
	const key = tpmFindAccessor(node);
	if ( ! key )
		return null;

	return node[key] ??
		node._reactRootContainer?._internalRoot?.current ??
		node._reactRootContainer?.current ?? null;
}

// Fine.onEnable: the root fiber FFZ starts its searches from.
function tpmGetRootFiber() {
	const element = document.querySelector('body #root');
	if ( ! element )
		return null;

	const node = tpmWaive(element);
	let root = node._reactRootContainer;
	if ( root?._internalRoot?.current )
		root = root._internalRoot;

	if ( root?.current )
		return root.current.child ?? null;

	const key = tpmFindAccessor(node, '__reactContainer');
	return key ? node[key] : null;
}

function tpmSafe(fn, node) {
	try {
		return fn(node);
	} catch (err) {
		return false;
	}
}

// Fine.searchNode: criteria tested against fibers.
function tpmSearchNode(node, criteria, maxDepth = 15, depth = 0) {
	if ( ! node || depth > maxDepth )
		return null;

	if ( tpmSafe(criteria, node) )
		return node;

	let child = node.child;
	while (child) {
		const result = tpmSearchNode(child, criteria, maxDepth, depth + 1);
		if ( result )
			return result;
		child = child.sibling;
	}

	const root = node.stateNode?.props?.root?._reactRootContainer;
	if ( root ) {
		let child = root._internalRoot?.current || root.current;
		while (child) {
			const result = tpmSearchNode(child, criteria, maxDepth, depth + 1);
			if ( result )
				return result;
			child = child.sibling;
		}
	}

	return null;
}

// Fine.searchTree: criteria tested against fiber.stateNode.
function tpmSearchTree(node, criteria, maxDepth = 15, depth = 0) {
	if ( ! node || depth > maxDepth )
		return null;

	const inst = node.stateNode;
	if ( inst && tpmSafe(criteria, inst) )
		return inst;

	let child = node.child;
	while (child) {
		const result = tpmSearchTree(child, criteria, maxDepth, depth + 1);
		if ( result )
			return result;
		child = child.sibling;
	}

	const root = inst?.props?.root?._reactRootContainer;
	if ( root ) {
		let child = root._internalRoot?.current || root.current;
		while (child) {
			const result = tpmSearchTree(child, criteria, maxDepth, depth + 1);
			if ( result )
				return result;
			child = child.sibling;
		}
	}

	return null;
}

// Collects every stateNode in the tree matching criteria. Used in place of
// FFZ's fine.define() instance tracking for the resize detectors.
function tpmFindAllInstances(root, criteria, limit = 200000) {
	const found = [];
	const stack = root ? [root] : [];
	let seen = 0;

	while (stack.length && seen < limit) {
		const node = stack.pop();
		seen++;

		const inst = node.stateNode;
		if ( inst && tpmSafe(criteria, inst) )
			found.push(inst);

		if ( node.sibling )
			stack.push(node.sibling);
		if ( node.child )
			stack.push(node.child);
	}

	return found;
}
