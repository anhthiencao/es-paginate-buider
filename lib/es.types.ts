/**
 * AttributeDtoEs represents the attributes for Elasticsearch documents.
 */
export interface AttributeDtoEs {
  isLink: boolean;
  key?: string | null | undefined;
  subKey?: string | null | undefined;
  rate?: number;
  allowSearchNoAccent?: boolean | null;
}

/**
 * ElasticsearchQuery represents the base query structure for Elasticsearch.
 */
export interface ElasticsearchQuery {
  bool: any;
}

/**
 * ElasticsearchQueryOptions represents the base query options for Elasticsearch.
 */
export interface QueryOptions {
  searchOptions?: SearchOptions,
}

/**
 * OrderingMode represents the ordering mode for sorting results.
 */
export enum OrderingMode {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Ordering represents the ordering key-value pair for sorting results.
 */
export interface Ordering {
  key: string;
  value: OrderingMode;
}

/**
 * Operator represents the filter operator for querying results.
 */
export enum Operator {
  eq = 'eq',
  neq = 'neq',
  like = 'like',
  gt = 'gt',
  gte = 'gte',
  lt = 'lt',
  lte = 'lte',
  exists = 'exists',
}

/**
 * FilterMode represents the filter mode for combining multiple filters.
 */
export enum FilterMode {
  OR = 'or',
  AND = 'and',
}

export enum SearchAnalyzes {
  IGNORE_DIACRITICS = 'ignore_diacritics',
  EXACT_ORDER = 'exact_order',
}


/**
 * SearchOptions represents the additional options for searching.
 */
export interface SearchOptions {
  analyzers?: SearchAnalyzes[]
  boost?: number
}

/**
 * Searching represents the search key-value pair along with optional search options.
 */
export interface Searching {
  key: string;
  value: string;
  options?: SearchOptions;
}

/**
 * IFilteredType represents the filter type for querying results.
 */
export interface IFilteredType<T = any> {
  key?: T;
  values?: string[];
  operator?: Operator;
  or?: IFilteredType<T>[];
  and?: IFilteredType<T>[];
}


