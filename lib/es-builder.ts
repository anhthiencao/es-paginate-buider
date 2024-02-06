import { checkSpecialCharacters, removeAccent } from './es-utils';
import {
  AttributeDtoEs,
  ElasticsearchQuery,
  IFilteredType,
  Operator,
  Ordering,
  PrioritySearch,
  SearchAnalyzes,
  Searching,
} from './es.types';

/**
 * Search documents in Elasticsearch based on a keyword and specific attributes.
 * @param keyword - The keyword to search for.
 * @param attributes - An array of attributes to restrict the search to.
 * @returns An Elasticsearch query object.
 *
 * @example
 * // Example usage:
 * const keyword = 'example';
 * const attributes = [
 *   { key: 'attribute1', rate: 1, subKey: null, allowSearchNoAccent: true },
 *   { key: 'attribute2', rate: 2, subKey: 'subKey', allowSearchNoAccent: false },
 * ];
 * const result = searchByKeyword(keyword, attributes);
 * // Returns the Elasticsearch query object.
 */

export function convertSearchAnalyzer(
  keyword: string,
  attributes: AttributeDtoEs[]
): object {
  const keywordNoAccent = removeAccent(keyword);
  const should = [];
  for (const attribute of attributes) {
    // If keyword have accent
    if (keywordNoAccent != keyword) {
      should.push(
        ...searchWithKeywordHasAccent(attribute, keyword, keywordNoAccent)
      );
    } else {
      should.push(...searchWithKeywordWithoutAccent(attribute, keyword));
    }
  }

  const searchTerms = {
    bool: {
      should,
      minimum_should_match: 1,
    },
  };

  return searchTerms;
}

/**
 * Create a single "should" clause for an Elasticsearch query.
 * @param attribute - The attribute to search.
 * @param value - The value to match.
 * @param valueNoAccent - Value remove accent.
 * @returns A single "should" clause for the Elasticsearch query.
 */

export function searchWithKeywordHasAccent(
  attribute: AttributeDtoEs,
  value: string,
  valueNoAccent: string
) {
  const isLink = value.includes('http');
  const isContainSpecialChar = checkSpecialCharacters(value);
  const should = [];

  if (!isLink) {
    //Case: Keyword is not link => search each word with priority lowest
    should.push(
      convertSingleSearchAnalyzer(
        `${attribute.key}.accent`,
        valueNoAccent,
        attribute.rate * PrioritySearch.Lowest,
        'match'
      )
    );
  }

  //search exactly result with special characters
  if (isContainSpecialChar) {
    should.push(
      //Case: Search all of word with priority medium (use match_phrase)
      convertSingleSearchAnalyzer(
        `${attribute.key}.accent`,
        valueNoAccent,
        attribute.rate * PrioritySearch.Medium
      )
    );
  } else {
    if (!isLink) {
      should.push(
        //Case: Keyword is not link => search each word with priority low
        convertSingleSearchAnalyzer(
          attribute.key,
          value,
          attribute.rate * PrioritySearch.Low,
          'match'
        )
      );
    }
    //Case: Search all of word with priority high (use match_phrase)
    should.push(
      convertSingleSearchAnalyzer(
        attribute.key,
        value,
        attribute.rate * PrioritySearch.High
      )
    );
  }

  should.push(
    //Case: Search exactly keyword with priority highest
    convertSingleSearchAnalyzer(
      `${attribute.key}.keyword`,
      value,
      attribute.rate * PrioritySearch.Highest,
      'term'
    )
  );

  return should;
}

/**
 * Create a single "should" clause for an Elasticsearch query.
 * @param attribute - The attribute to search.
 * @param value - The value to match.
 * @returns A single "should" clause for the Elasticsearch query.
 */

export function searchWithKeywordWithoutAccent(
  attribute: AttributeDtoEs,
  value: string
) {
  const isLink = value.includes('http');
  const isContainSpecialChar = checkSpecialCharacters(value);
  const should = [];
  if (attribute.allowSearchNoAccent) {
    //Allow search without accent (use match_phrase)
    should.push(
      convertSingleSearchAnalyzer(
        `${attribute.key}.accent`,
        value,
        attribute.rate * PrioritySearch.Medium
      )
    );
  }

  //search exactly result with special characters
  if (isContainSpecialChar) {
    if (!isLink) {
      //Case: Keyword is not link => search each word with priority lowest
      should.push(
        convertSingleSearchAnalyzer(
          `${attribute.key}.accent`,
          value,
          attribute.rate * PrioritySearch.Lowest,
          'match'
        )
      );
    }
    //Case: Search exactly keyword with priority highest
    should.push(
      convertSingleSearchAnalyzer(
        `${attribute.key}.keyword`,
        value,
        attribute.rate * PrioritySearch.Highest,
        'term'
      )
    );
  } else {
    if (!isLink) {
      if (attribute.allowSearchNoAccent) {
        //Case: Keyword is not link => search each word which is removed accent with priority lowest
        should.push(
          convertSingleSearchAnalyzer(
            `${attribute.key}.accent`,
            value,
            attribute.rate * PrioritySearch.Lowest,
            'match'
          )
        );
      }
      //Case: Keyword is not link => search each word with priority low
      should.push(
        convertSingleSearchAnalyzer(
          attribute.key,
          value,
          attribute.rate * PrioritySearch.Low,
          'match'
        )
      );
    }
    //Case: Search all of word with priority high (use match_phrase)
    should.push(
      convertSingleSearchAnalyzer(
        attribute.key,
        value,
        attribute.rate * PrioritySearch.High
      )
    );
  }
  return should;
}
/**
 * Create a single "should" clause for an Elasticsearch query.
 * @param key - The key to match against.
 * @param value - The value to match.
 * @param boost - The boost value for the key.
 * @param operator - The type of match (e.g., "match_phrase", "term").
 * @returns A single "should" clause for the Elasticsearch query.
 *
 * @example
 * // Example usage:
 * const key = 'name';
 * const value = 'tim';
 * const boost = 1;
 * const operator = 'match_phrase';
 * const itemShould = convertSingleSearchAnalyze(key, value, boost, operator);
 * // Returns:
 * // {
 * //   bool: {
 * //     must: {
 * //       match_phrase: {
 * //         name: 'tim',
 * //       },
 * //     },
 * //     boost: 1,
 * //   }
 * // }
 */
export function convertSingleSearchAnalyzer(
  key: string,
  value: string | number,
  boost: number,
  operator: string = 'match_phrase'
) {
  return {
    bool: {
      must: {
        [operator]: {
          [key]: value,
        },
      },
      boost,
    },
  };
}

/**
 * Convert a single filter or an array of filters to an Elasticsearch query.
 * @param filters - The filter(s) to convert.
 * @returns The Elasticsearch query object.
 *
 * @example
 * convertFilteringElasticsearchQuery({
 *   key: 'name',
 *   operator: Operator.eq,
 *   values: ['John']
 * });
 *
 * // Returns:
 * // {
 * //   bool: {
 * //     must: [
 * //       {
 * //         term: {
 * //           name: 'John'
 * //         }
 * //       }
 * //     ]
 * //   }
 * // }
 */
export function convertFilteringElasticsearchQuery<
  T extends IFilteredType = IFilteredType
>(filters: T | T[]): ElasticsearchQuery {
  const queryEs: ElasticsearchQuery = {
    bool: {},
  };

  if (!filters) {
    return queryEs;
  }

  if (Array.isArray(filters)) {
    queryEs.bool = {
      must: filters.map((singleFilter) => convertSingleFilter(singleFilter)),
    };
  } else {
    queryEs.bool = {
      must: [convertSingleFilter(filters)],
    };
  }

  return queryEs;
}

/**
 * Convert a single query to an Elasticsearch query object.
 * @param key - The key to match against.
 * @param value - The value to match.
 * @param operator - The operator to use (default: 'match_phrase').
 * @returns The Elasticsearch query object.
 *
 * @example
 * convertSingleQuery('name', 'John', 'match_phrase');
 *
 * // Returns:
 * // {
 * //   match_phrase: {
 * //     name: 'John'
 * //   }
 * // }
 */
export function convertSingleQuery(
  key: string,
  value: string,
  operator = 'match_phrase'
): any {
  const nestedKeys = key.split(/\.(?!\$keyword)/g);
  const query = {};
  let currentPath = query;

  for (let i = 0; i < nestedKeys.length - 1; i++) {
    currentPath['nested'] = {
      path: nestedKeys[i].endsWith('$keyword')
        ? nestedKeys[i].replace('$', '')
        : nestedKeys[i],
      query: {},
    };
    currentPath = currentPath['nested']['query'];
  }

  currentPath[operator] = {
    [key.endsWith('$keyword') ? key.replace('$', '') : key]: value,
  };

  return query;
}

/**
 * Convert a single filter to an Elasticsearch query object.
 * @param filter - The filter to convert.
 * @returns The Elasticsearch query object.
 *
 * @example
 * convertSingleFilter({
 *   key: 'name',
 *   operator: Operator.eq,
 *   values: ['John']
 * });
 *
 * // Returns:
 * // {
 * //   bool: {
 * //     must: [
 * //       {
 * //         term: {
 * //           name: 'John'
 * //         }
 * //       }
 * //     ]
 * //   }
 * // }
 */
export function convertSingleFilter(filter: IFilteredType): any {
  const fieldFilter: any = {};

  const { and = [], or = [], key, operator, values = [] } = filter;

  fieldFilter.bool = {
    must: and.map((value) => convertSingleFilter(value)),
    should: or.map((value) => convertSingleFilter(value)),
  };

  if (!key) {
    return fieldFilter;
  }

  const operatorMapping = {
    [Operator.eq]: 'term',
    [Operator.neq]: 'term',
    [Operator.like]: 'match_phrase',
    [Operator.gt]: 'range',
    [Operator.gte]: 'range',
    [Operator.lt]: 'range',
    [Operator.lte]: 'range',
    [Operator.exists]: 'exists',
  };

  const esOperator = operatorMapping[operator];

  if (!esOperator) {
    throw new Error(`Unsupported operator: ${operator}`);
  }

  switch (operator) {
    case Operator.gt:
    case Operator.gte:
    case Operator.lt:
    case Operator.lte:
      if (values.length !== 1) {
        throw new Error(`Operator ${operator} requires exactly one value`);
      }
      fieldFilter.bool.must = [
        ...fieldFilter.bool.must,
        {
          [esOperator]: {
            [key]: { [operator]: values[0] },
          },
        },
      ];
      break;
    case Operator.exists:
      fieldFilter.bool.must = [
        ...fieldFilter.bool.must,
        {
          exists: {
            field: key,
          },
        },
      ];
      break;
    case Operator.neq:
      fieldFilter.bool.must = [
        ...fieldFilter.bool.must,
        {
          bool: {
            must_not: values.map((value) =>
              convertSingleQuery(key, value, esOperator)
            ),
          },
        },
      ];
      break;
    case Operator.like:
    case Operator.eq:
      fieldFilter.bool.must = [
        ...fieldFilter.bool.must,
        {
          bool: {
            should: values.map((value) =>
              convertSingleQuery(key, value, esOperator)
            ),
          },
        },
      ];
      break;
    default:
      break;
  }

  return fieldFilter;
}

/**
 * Convert a single search input to an Elasticsearch query object.
 * @param searchInput - The search input to convert.
 * @returns The Elasticsearch query object.
 *
 * @example
 * convertSingleSearch({
 *   key: 'name',
 *   value: 'John',
 *   options: [{ boost: 1, analyzes: SearchOptions.EXACT_ORDER }]
 * });
 *
 * // Returns:
 * // {
 * //   bool: {
 * //     must: [
 * //       {
 * //         match_phrase: {
 * //           name: 'John'
 * //         }
 * //       },
 * //       boost: 1
 * //     ]
 * //   }
 * // }
 */
export function convertSingleSearch(searchInput: Searching): any {
  const queryEs = {};

  const { key, value, options = {} } = searchInput;

  if (!options?.analyzers) {
    return queryEs;
  }

  if (options.analyzers.length === 0) {
    queryEs['match'] = {
      [key]: value,
    };
  } else {
    const attributes: AttributeDtoEs[] = [
      {
        key,
        rate: 1,
        allowSearchNoAccent: true,
        isLink: false,
        subKey: null,
      },
    ];

    const mappingSearchingToElasticsearch = {
      [SearchAnalyzes.IGNORE_DIACRITICS]: convertSearchAnalyzer(
        value,
        attributes
      ),
      [SearchAnalyzes.EXACT_ORDER]: {
        match_phrase: {
          [key]: value,
        },
      },
    };
    queryEs['bool'] = {
      must: options.analyzers.map(
        (analyze) => mappingSearchingToElasticsearch[analyze]
      ),
    };
  }
  return queryEs;
}

/**
 * Convert a single search input or an array of search inputs to an Elasticsearch query object.
 * @param searchInput - The search input(s) to convert.
 * @param isHighlight - Whether to include highlighting in the query (default: false).
 * @returns An object containing the Elasticsearch query and highlight objects.
 *
 * @example
 * convertSearchingToElasticsearchQuery([
 *   {
 *     key: 'name',
 *     value: 'John',
 *     options: [{ analyzes: SearchOptions.EXACT_ORDER }]
 *   },
 *   {
 *     key: 'age',
 *     value: '30',
 *     options: []
 *   }
 * ], true);
 *
 * // Returns:
 * // {
 * //   queryEs: {
 * //     bool: {
 * //       should: [
 * //         {
 * //           match_phrase: {
 * //             name: 'John'
 * //           }
 * //         },
 * //         {
 * //           match: {
 * //             age: '30'
 * //           }
 * //         }
 * //       ]
 * //     }
 * //   },
 * //   highlight: {
 * //     fields: {
 * //       name: {},
 * //       'name.accent': {}
 * //     }
 * //   }
 * // }
 */
export function convertSearchingToElasticsearchQuery<T extends Searching>(
  searchInput: T | T[],
  isHighlight = false
): { queryEs: object; highlight: object } {
  let highlight = { fields: {} };
  const queryEs = {
    bool: {},
  };

  if (!searchInput)
    return { queryEs, highlight: isHighlight ? highlight : undefined };

  if (Array.isArray(searchInput)) {
    queryEs.bool = {
      should: searchInput.map((singleSearch) =>
        convertSingleSearch(singleSearch)
      ),
    };
    if (isHighlight) {
      for (const item of searchInput) {
        highlight.fields[item.key] = {};
        if (
          item.options.analyzers.find(
            (e) => e === SearchAnalyzes.IGNORE_DIACRITICS
          )
        ) {
          highlight.fields[`${item.key}.accent`] = {};
        }
      }
    } else {
      highlight = undefined;
    }
  } else {
    queryEs.bool = {
      must: convertSingleSearch(searchInput),
    };
    if (isHighlight) {
      highlight.fields[searchInput.key] = {};
    } else {
      highlight = undefined;
    }
  }

  return { queryEs, highlight };
}

/**
 * Convert a single ordering input or an array of ordering inputs to an Elasticsearch query object.
 * @param orderInput - The ordering input(s) to convert.
 * @returns The Elasticsearch query object.
 *
 * @example
 * convertOrderingToElasticsearchQuery([
 *   {
 *     key: 'name',
 *     value: 'asc'
 *   },
 *   {
 *     key: 'age',
 *     value: 'desc'
 *   }
 * ]);
 *
 * // Returns:
 * // [
 * //   {
 * //     name: 'asc'
 * //   },
 * //   {
 * //     age: 'desc'
 * //   }
 * // ]
 */
export function convertOrderingToElasticsearchQuery<T extends Ordering>(
  orderInput: T | T[]
) {
  if (!Array.isArray(orderInput)) {
    const { key, value } = orderInput;
    return [
      {
        [key]: value,
      },
    ];
  }

  return orderInput.map((item) => ({
    [item.key]: item.value,
  }));
}

/**
 * Build a complete Elasticsearch query object based on the provided arguments.
 * @param args - The arguments for building the query.
 * @returns The Elasticsearch query object.
 *
 * @example
 * buildQueryArgsToElasticsearchQuery({
 *   filters: [
 *     {
 *       key: 'name',
 *       operator: Operator.eq,
 *       values: ['John']
 *     }
 *   ],
 *   searches: [
 *     {
 *       key: 'name',
 *       value: 'John',
 *       options: [{ analyzes: SearchOptions.EXACT_ORDER }]
 *     },
 *     {
 *       key: 'age',
 *       value: '30',
 *       options: []
 *     }
 *   ],
 *   orders: [
 *     {
 *       key: 'name',
 *       value: 'asc'
 *     }
 *   ],
 *   offset: 10,
 *   limit: 20,
 *   isHighlight: true
 * });
 *
 * // Returns:
 * // {
 * //   query: {
 * //     bool: {
 * //       must: [
 * //         {
 * //           bool: {
 * //             must: [
 * //               {
 * //                 term: {
 * //                   name: 'John'
 * //                 }
 * //               }
 * //             ]
 * //           }
 * //         },
 * //         {
 * //           bool: {
 * //             should: [
 * //               {
 * //                 match_phrase: {
 * //                   name: 'John'
 * //                 }
 * //               },
 * //               {
 * //                 match: {
 * //                   age: '30'
 * //                 }
 * //               }
 * //             ]
 * //           }
 * //         }
 * //       ]
 * //     }
 * //   },
 * //   from: 10,
 * //   size: 20,
 * //   sort: [
 * //     {
 * //       name: 'asc'
 * //     }
 * //   ],
 * //   highlight: {
 * //     fields: {
 * //       name: {},
 * //       'name.accent': {},
 * //       age: {}
 * //     }
 * //   }
 * // }
 */
export function buildQueryArgsToElasticsearchQuery<
  T extends IFilteredType = IFilteredType,
  U extends Searching = Searching,
  V extends Ordering = Ordering
>(args: {
  filters?: T | T[];
  searches?: U | U[];
  orders?: V | V[];
  offset?: number;
  limit?: number;
  isHighlight?: boolean;
  track_total_hits?: boolean;
}) {
  const {
    filters = [],
    searches = [],
    orders = [],
    offset,
    limit,
    isHighlight = false,
    track_total_hits = false,
  } = args;
  const esFilter = convertFilteringElasticsearchQuery<T>(filters);
  const esSearch = convertSearchingToElasticsearchQuery<U>(
    searches,
    isHighlight
  );
  const esOrder = convertOrderingToElasticsearchQuery<V>(orders);

  return {
    query: {
      bool: {
        must: [esFilter, esSearch.queryEs],
      },
    },
    ...(offset && { from: offset }),
    ...(limit && { size: limit }),
    ...(esOrder.length && { sort: esOrder }),
    ...(isHighlight && { highlight: esSearch.highlight }),
    ...(track_total_hits && { track_total_hits }),
  };
}
