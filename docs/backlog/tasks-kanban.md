# Tasks — Kanban Core

## Core endpoints
- Create board
- Board detail (lists + cards)
- Create list, rename list, reorder list
- Create card, update card, move/reorder card
- Archive board/list/card

## Position float
Implement helpers:
- insert between prev/next
- insert at head/tail
- empty list defaults
- rebalance when gap too small

## Tasks
1. DB: boards, lists, cards (+ indexes)
2. Position helper library + tests
3. Move card endpoint
   - validate membership (via board->workspace)
   - compute position
   - update card listId + position
4. Rebalance job
   - sync MVP
   - optional async later
5. Realtime emits
   - list_created/updated/reordered
   - card_created/updated/moved

## Acceptance criteria
- Drag-drop repeatedly does not break ordering
- Rebalance keeps stable order