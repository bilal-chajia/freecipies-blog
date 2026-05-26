export type FAQItem = {
  q: string;
  a: string;
};

export type IndexState = Record<number, boolean>;

export type FAQItemField = keyof FAQItem;
