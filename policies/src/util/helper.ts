export function getLabelsAsArray(labels: { [key: string]: string } | undefined): string[] {
  let array: string[] = []
  for (const key in labels) {
    array.push(key)
  }
  return array
}

export const formatYmd = (date: Date) => date.toISOString().slice(0, 10);
