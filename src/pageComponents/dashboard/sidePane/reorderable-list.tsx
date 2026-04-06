import { createContext, useRef } from "react";
import type { HTMLAttributes, JSX, Key, ReactNode } from "react";
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
} from "react-aria";
import type {
  DraggableItemProps,
  DragItem,
  DropIndicatorProps,
  DroppableCollectionReorderEvent,
} from "react-aria";
import {
  useDraggableCollectionState,
  useDroppableCollectionState,
  useListState,
} from "react-stately";
import type {
  DraggableCollectionState,
  DroppableCollectionState,
  ListProps,
  ListState,
} from "react-stately";

import isNull from "lodash/isNull";
import omit from "lodash/omit";

// ============================================================================
// Types
// ============================================================================

export interface ReorderableListBoxProps extends ListProps<object> {
  getItems?: (keys: Set<Key>) => DragItem[];
  /**
   * When true, shows drop-target highlight on items during card drags
   */
  highlightDropTarget?: boolean;
  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  onItemDrop?: (event: any) => void;
  onReorder: (event: DroppableCollectionReorderEvent) => unknown;
  renderDragPreview: (items: DragItem[]) => JSX.Element;
}

type OptionDropItemTypes = DraggableItemProps & {
  rendered: ReactNode;
};

// ============================================================================
// DropIndicator
// ============================================================================

type ReorderDropIndicatorProps = DropIndicatorProps & {
  dropState: DroppableCollectionState;
  position: "after" | "before";
};

function ReorderDropIndicator(props: ReorderDropIndicatorProps) {
  const { dropState, position } = props;
  const ref = useRef(null);
  const { dropIndicatorProps, isDropTarget, isHidden } = useDropIndicator(props, dropState, ref);

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

export const DragHandleContext = createContext<HTMLAttributes<Element> | null>(null);

// ============================================================================
// ReorderableOption
// ============================================================================

function ReorderableOption({
  dragState,
  dropState,
  highlightDropTarget = false,
  item,
  state,
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
  const { focusProps, isFocusVisible } = useFocusRing();

  const { dropProps, isDropTarget } = useDroppableItem(
    {
      target: { dropPosition: "on", key: item.key, type: "item" },
    },
    dropState,
    ref,
  );

  const mergedProps = omit(mergeProps(optionProps, dropProps, focusProps), [
    "onKeyDown",
    "onKeyDownCapture",
    "onKeyUp",
    "onKeyUpCapture",
  ]);

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
        target={{ dropPosition: "before", key: item.key, type: "item" }}
      />
      <DragHandleContext value={dragProps}>{item.rendered}</DragHandleContext>
      {state.collection.getKeyAfter(item.key) === null && (
        <ReorderDropIndicator
          dropState={dropState}
          position="after"
          target={{ dropPosition: "after", key: item.key, type: "item" }}
        />
      )}
    </li>
  );
}

// ============================================================================
// ReorderableListBox
// ============================================================================

export function ReorderableListBox(props: ReorderableListBoxProps) {
  const { getItems, highlightDropTarget, renderDragPreview } = props;
  const state = useListState(props);
  const ref = useRef(null);
  const previewRef = useRef(null);

  const { listBoxProps } = useListBox({ ...props, shouldSelectOnPressUp: true }, state, ref);

  const dropState = useDroppableCollectionState({
    ...props,
    collection: state.collection,
    selectionManager: state.selectionManager,
  });

  const { collectionProps } = useDroppableCollection(
    {
      ...props,
      dropTargetDelegate: new ListDropTargetDelegate(state.collection, ref),
      keyboardDelegate: new ListKeyboardDelegate(state.collection, state.disabledKeys, ref),
    },
    dropState,
    ref,
  );

  const dragState = useDraggableCollectionState({
    ...props,
    collection: state.collection,
    getItems:
      getItems ??
      ((keys) =>
        [...keys].map((key) => {
          const item = state.collection.getItem(key);

          return {
            "text/plain": !isNull(item) ? item.textValue : "",
          };
        })),
    preview: previewRef,
    selectionManager: state.selectionManager,
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
      <DragPreview ref={previewRef}>{(items) => renderDragPreview(items)}</DragPreview>
    </ul>
  );
}
