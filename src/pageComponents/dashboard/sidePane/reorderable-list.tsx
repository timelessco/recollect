import { type JSX, useRef, type Key, type ReactNode } from "react";
import isNull from "lodash/isNull";
import omit from "lodash/omit";
import {
	DragPreview,
	ListDropTargetDelegate,
	ListKeyboardDelegate,
	mergeProps,
	useDraggableCollection,
	useDraggableItem,
	useDropIndicator,
	useDroppableCollection,
	useDroppableItem,
	useFocusRing,
	useListBox,
	useOption,
	type DraggableItemProps,
	type DragItem,
	type DropIndicatorProps,
	type DroppableCollectionReorderEvent,
} from "react-aria";
import {
	useDraggableCollectionState,
	useDroppableCollectionState,
	useListState,
	type DraggableCollectionState,
	type DroppableCollectionState,
	type ListProps,
	type ListState,
} from "react-stately";

// ============================================================================
// Types
// ============================================================================

export interface ReorderableListBoxProps extends ListProps<object> {
	getItems?: (keys: Set<Key>) => DragItem[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onItemDrop?: (event: any) => void;
	onReorder: (event: DroppableCollectionReorderEvent) => unknown;
	renderDragPreview: (items: DragItem[]) => JSX.Element;
	/**
	 * When true, shows drop-target highlight on items during card drags
	 */
	highlightDropTarget?: boolean;
}

type OptionDropItemTypes = DraggableItemProps & {
	rendered: ReactNode;
};

// ============================================================================
// DropIndicator
// ============================================================================

type ReorderDropIndicatorProps = DropIndicatorProps & {
	dropState: DroppableCollectionState;
	position: "before" | "after";
};

function ReorderDropIndicator(props: ReorderDropIndicatorProps) {
	const { dropState, position } = props;
	const ref = useRef(null);
	const { dropIndicatorProps, isHidden, isDropTarget } = useDropIndicator(
		props,
		dropState,
		ref,
	);

	if (isHidden) {
		return null;
	}

	return (
		<div
			{...dropIndicatorProps}
			className={`drop-indicator ${position} ${isDropTarget ? "drop-target" : ""}`}
			ref={ref}
			role="presentation"
		/>
	);
}

// ============================================================================
// ReorderableOption
// ============================================================================

function ReorderableOption({
	item,
	state,
	dropState,
	dragState,
	highlightDropTarget = false,
}: {
	dragState: DraggableCollectionState;
	dropState: DroppableCollectionState;
	highlightDropTarget?: boolean;
	item: OptionDropItemTypes;
	state: ListState<unknown>;
}) {
	const { dragProps } = useDraggableItem({ key: item.key }, dragState);

	const ref = useRef(null);
	const { optionProps } = useOption({ key: item.key }, state, ref);
	const { isFocusVisible, focusProps } = useFocusRing();

	const { dropProps, isDropTarget } = useDroppableItem(
		{
			target: { type: "item", key: item.key, dropPosition: "on" },
		},
		dropState,
		ref,
	);

	const mergedProps = omit(
		mergeProps(optionProps, dropProps, focusProps, dragProps),
		["onKeyDown", "onKeyDownCapture", "onKeyUp", "onKeyUpCapture"],
	);

	return (
		<li
			{...mergedProps}
			className={`option-drop relative outline-hidden ${isFocusVisible ? "ring-1 ring-gray-200" : ""} ${
				isDropTarget && highlightDropTarget ? "drop-target" : ""
			}`}
			ref={ref}
		>
			<ReorderDropIndicator
				dropState={dropState}
				position="before"
				target={{ type: "item", key: item.key, dropPosition: "before" }}
			/>
			{item.rendered}
			{state.collection.getKeyAfter(item.key) === null && (
				<ReorderDropIndicator
					dropState={dropState}
					position="after"
					target={{ type: "item", key: item.key, dropPosition: "after" }}
				/>
			)}
		</li>
	);
}

// ============================================================================
// ReorderableListBox
// ============================================================================

export function ReorderableListBox(props: ReorderableListBoxProps) {
	const { getItems, renderDragPreview, highlightDropTarget } = props;
	const state = useListState(props);
	const ref = useRef(null);
	const preview = useRef(null);

	const { listBoxProps } = useListBox(
		{ ...props, shouldSelectOnPressUp: true },
		state,
		ref,
	);

	const dropState = useDroppableCollectionState({
		...props,
		collection: state.collection,
		selectionManager: state.selectionManager,
	});

	const { collectionProps } = useDroppableCollection(
		{
			...props,
			keyboardDelegate: new ListKeyboardDelegate(
				state.collection,
				state.disabledKeys,
				ref,
			),
			dropTargetDelegate: new ListDropTargetDelegate(state.collection, ref),
		},
		dropState,
		ref,
	);

	const dragState = useDraggableCollectionState({
		...props,
		collection: state.collection,
		selectionManager: state.selectionManager,
		preview,
		getItems:
			getItems ??
			((keys) =>
				[...keys].map((key) => {
					const item = state.collection.getItem(key);

					return {
						"text/plain": !isNull(item) ? item.textValue : "",
					};
				})),
	});

	useDraggableCollection(props, dragState, ref);

	const ulProps = omit(mergeProps(listBoxProps, collectionProps), [
		"onKeyDown",
		"onKeyDownCapture",
		"onKeyUp",
		"onKeyUpCapture",
	]);

	return (
		<ul {...ulProps} className="flex flex-col gap-px" ref={ref}>
			{[...state.collection].map((item) => (
				<ReorderableOption
					dragState={dragState}
					dropState={dropState}
					highlightDropTarget={highlightDropTarget}
					item={item}
					key={item.key}
					state={state}
				/>
			))}
			<DragPreview ref={preview}>
				{(items) => renderDragPreview(items)}
			</DragPreview>
		</ul>
	);
}
