/** Everything a group (and its rows) can ask the plan screen to do. Kept stable so rows can be memoised. */
export interface GroupHandlers {
  onToggle(groupId: string): void
  onEditGroup(groupId: string): void
  onDeleteGroup(groupId: string): void
  onMoveGroup(groupId: string, offset: -1 | 1): void
  onAddItem(groupId: string): void
  onEditItem(groupId: string, itemId: string): void
  onDuplicateItem(groupId: string, itemId: string): void
  onDeleteItem(groupId: string, itemId: string): void
}
