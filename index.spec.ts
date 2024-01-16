import {
  buildQueryArgsToElasticsearchQuery,
  checkSpecialCharacters,
  convertFilteringElasticsearchQuery,
  convertOrderingToElasticsearchQuery,
  convertSearchingToElasticsearchQuery,
  convertSingleFilter,
  convertSingleQuery,
  convertSingleSearch,
  convertSingleSearchAnalyzer,
  removeAccent,
} from './lib';
import { Operator, OrderingMode, SearchAnalyzes } from './lib/es.types';

describe('checkSpecialCharacters', () => {
  test.each([
    ['example', false],
    ['example!', true],
    ['@example', true],
  ])(
    'should return true if the string contains special characters',
    (str, expected) => {
      // Act
      const result = checkSpecialCharacters(str);

      // Assert
      expect(result).toBe(expected);
    }
  );
});

describe('removeAccent', () => {
  test('should remove accents from a string', () => {
    const str = 'éxàmple';
    const cleanedStr = removeAccent(str);
    expect(cleanedStr).toBe('example');
  });

  test('should handle strings without accents', () => {
    const str = 'example';
    const cleanedStr = removeAccent(str);
    expect(cleanedStr).toBe('example');
  });
});

describe('convertSingleSearchAnalyzer', () => {
  test('should create a "should" clause for match_phrase operator', () => {
    const key = 'name';
    const value = 'John';
    const boost = 1;
    const operator = 'match_phrase';
    const result = convertSingleSearchAnalyzer(key, value, boost, operator);

    expect(result).toEqual({
      bool: {
        must: {
          match_phrase: {
            name: 'John',
          },
        },
        boost: 1,
      },
    });
  });
});

describe('convertSingleSearch', () => {
  test('should convert a single search input to an Elasticsearch query object by EXACT_ORDER', () => {
    const searchInput = {
      key: 'name',
      value: 'John',
      options: { analyzers: [SearchAnalyzes.EXACT_ORDER] },
    };
    const result = convertSingleSearch(searchInput);

    expect(result).toEqual({
      bool: {
        must: [
          {
            match_phrase: {
              name: 'John',
            },
          },
        ],
      },
    });
  });

  test('should convert a single search input to an Elasticsearch query object by IGNORE_DIACRITICS', () => {
    const searchInput = {
      key: 'name',
      value: 'John',
      options: { analyzers: [SearchAnalyzes.IGNORE_DIACRITICS] },
    };
    const result = convertSingleSearch(searchInput);

    expect(result).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must: {
                      match_phrase: {
                        'name.accent': 'John',
                      },
                    },
                    boost: 3,
                  },
                },
                {
                  bool: {
                    must: {
                      match: {
                        'name.accent': 'John',
                      },
                    },
                    boost: 1,
                  },
                },
                {
                  bool: {
                    must: {
                      match: {
                        name: 'John',
                      },
                    },
                    boost: 2,
                  },
                },
                {
                  bool: {
                    must: {
                      match_phrase: {
                        name: 'John',
                      },
                    },
                    boost: 4,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  });
});

describe('convertFilteringElasticsearchQuery', () => {
  test('should convert a single filter to an Elasticsearch query object', () => {
    const filter = {
      key: 'name',
      operator: Operator.eq,
      values: ['John'],
    };
    const result = convertFilteringElasticsearchQuery(filter);

    expect(result).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    should: [
                      {
                        term: {
                          name: 'John',
                        },
                      },
                    ],
                  },
                },
              ],
              should: [],
            },
          },
        ],
      },
    });
  });

  test('should convert multiple filters to an Elasticsearch query object', () => {
    const filters = [
      {
        key: 'name',
        operator: Operator.eq,
        values: ['John'],
      },
      {
        key: 'age',
        operator: Operator.gt,
        values: ['30'],
      },
    ];
    const result = convertFilteringElasticsearchQuery(filters);

    expect(result).toEqual({
      bool: {
        must: [
          {
            bool: {
              must: [
                {
                  bool: {
                    should: [
                      {
                        term: {
                          name: 'John',
                        },
                      },
                    ],
                  },
                },
              ],
              should: [],
            },
          },
          {
            bool: {
              must: [
                {
                  range: {
                    age: {
                      gt: '30',
                    },
                  },
                },
              ],
              should: [],
            },
          },
        ],
      },
    });
  });
});

describe('convertSingleQuery', () => {
  test('should convert a single query to an Elasticsearch query object', () => {
    const key = 'name';
    const value = 'John';
    const operator = 'match_phrase';
    const result = convertSingleQuery(key, value, operator);

    expect(result).toEqual({
      match_phrase: {
        name: 'John',
      },
    });
  });
});

describe('convertSingleFilter', () => {
  test('should convert a single equality filter to an Elasticsearch query object', () => {
    const filter = {
      key: 'name',
      operator: Operator.eq,
      values: ['John'],
    };
    const result = convertSingleFilter(filter);

    expect(result).toEqual({
      bool: {
        must: [{ bool: { should: [{ term: { name: 'John' } }] } }],
        should: [],
      },
    });
  });

  test('should convert a single "not equal" filter to an Elasticsearch query object', () => {
    const filter = {
      key: 'name',
      operator: Operator.neq,
      values: ['John'],
    };
    const result = convertSingleFilter(filter);

    expect(result).toEqual({
      bool: {
        must: [{ bool: { must_not: [{ term: { name: 'John' } }] } }],
        should: [],
      },
    });
  });

  test('should convert a single "like" filter to an Elasticsearch query object', () => {
    const filter = {
      key: 'name',
      operator: Operator.like,
      values: ['John', 'Jane'],
    };
    const result = convertSingleFilter(filter);

    expect(result).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                { match_phrase: { name: 'John' } },
                { match_phrase: { name: 'Jane' } },
              ],
            },
          },
        ],
        should: [],
      },
    });
  });

  test('should convert a single "greater than" filter to an Elasticsearch query object', () => {
    const filter = {
      key: 'age',
      operator: Operator.gt,
      values: ['30'],
    };
    const result = convertSingleFilter(filter);

    expect(result).toEqual({
      bool: { must: [{ range: { age: { gt: '30' } } }], should: [] },
    });
  });

  test('should convert a single "greater than or equal" filter to an Elasticsearch query object', () => {
    const filter = {
      key: 'age',
      operator: Operator.gte,
      values: ['30'],
    };
    const result = convertSingleFilter(filter);

    expect(result).toEqual({
      bool: { must: [{ range: { age: { gte: '30' } } }], should: [] },
    });
  });

  test('should convert a single "less than" filter to an Elasticsearch query object', () => {
    const filter = {
      key: 'age',
      operator: Operator.lt,
      values: ['40'],
    };
    const result = convertSingleFilter(filter);

    expect(result).toEqual({
      bool: { must: [{ range: { age: { lt: '40' } } }], should: [] },
    });
  });

  test('should convert a single "less than or equal" filter to an Elasticsearch query object', () => {
    const filter = {
      key: 'age',
      operator: Operator.lte,
      values: ['40'],
    };
    const result = convertSingleFilter(filter);

    expect(result).toEqual({
      bool: { must: [{ range: { age: { lte: '40' } } }], should: [] },
    });
  });

  test('should convert a single "exists" filter to an Elasticsearch query object', () => {
    const filter = {
      key: 'name',
      operator: Operator.exists,
    };
    const result = convertSingleFilter(filter);

    expect(result).toEqual({
      bool: { must: [{ exists: { field: 'name' } }], should: [] },
    });
  });
});

describe('convertSearchingToElasticsearchQuery', () => {
  test('should convert a single search input to an Elasticsearch query object without highlighting', () => {
    const searchInput = {
      key: 'name',
      value: 'John',
      options: { analyzers: [SearchAnalyzes.EXACT_ORDER] },
    };
    const result = convertSearchingToElasticsearchQuery(searchInput);

    expect(result).toEqual({
      queryEs: {
        bool: {
          must: { bool: { must: [{ match_phrase: { name: 'John' } }] } },
        },
      },
    });
  });

  test('should convert multiple search inputs to an Elasticsearch query object with highlighting', () => {
    const searchInputs = [
      {
        key: 'name',
        value: 'John',
        options: { analyzers: [SearchAnalyzes.EXACT_ORDER] },
      },
      {
        key: 'age',
        value: '30',
        options: { analyzers: [SearchAnalyzes.IGNORE_DIACRITICS] },
      },
    ];
    const result = convertSearchingToElasticsearchQuery(searchInputs, true);

    expect(result).toEqual({
      queryEs: {
        bool: {
          should: [
            { bool: { must: [{ match_phrase: { name: 'John' } }] } },
            {
              bool: {
                must: [
                  {
                    bool: {
                      should: [
                        {
                          bool: {
                            must: { match_phrase: { 'age.accent': '30' } },
                            boost: 3,
                          },
                        },
                        {
                          bool: {
                            must: { match: { 'age.accent': '30' } },
                            boost: 1,
                          },
                        },
                        { bool: { must: { match: { age: '30' } }, boost: 2 } },
                        {
                          bool: {
                            must: { match_phrase: { age: '30' } },
                            boost: 4,
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      highlight: { fields: { name: {}, age: {}, 'age.accent': {} } },
    });
  });

  test('should convert a single search input to an Elasticsearch query object with highlighting', () => {
    const searchInput = {
      key: 'name',
      value: 'John',
      options: { analyzers: [SearchAnalyzes.IGNORE_DIACRITICS] },
    };
    const result = convertSearchingToElasticsearchQuery(searchInput, true);

    expect(result).toEqual({
      queryEs: {
        bool: {
          must: {
            bool: {
              must: [
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          must: { match_phrase: { 'name.accent': 'John' } },
                          boost: 3,
                        },
                      },
                      {
                        bool: {
                          must: { match: { 'name.accent': 'John' } },
                          boost: 1,
                        },
                      },
                      { bool: { must: { match: { name: 'John' } }, boost: 2 } },
                      {
                        bool: {
                          must: { match_phrase: { name: 'John' } },
                          boost: 4,
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
      },
      highlight: { fields: { name: {} } },
    });
  });
});

describe('convertOrderingToElasticsearchQuery', () => {
  test('should convert a single ordering input to an Elasticsearch query object', () => {
    const orderInput = { key: 'name', value: OrderingMode.ASC };
    const result = convertOrderingToElasticsearchQuery(orderInput);
    expect(result).toEqual([
      {
        name: 'asc',
      },
    ]);
  });

  test('should convert multiple ordering inputs to an Elasticsearch query object', () => {
    const orderInputs = [
      { key: 'name', value: OrderingMode.ASC },
      { key: 'age', value: OrderingMode.DESC },
    ];
    const result = convertOrderingToElasticsearchQuery(orderInputs);

    expect(result).toEqual([
      {
        name: 'asc',
      },
      {
        age: 'desc',
      },
    ]);
  });
});

describe('buildQueryArgsToElasticsearchQuery', () => {
  test('should build a complete Elasticsearch query object with default values', () => {
    const result = buildQueryArgsToElasticsearchQuery({});

    expect(result).toEqual({
      query: {
        bool: { must: [{ bool: { must: [] } }, { bool: { should: [] } }] },
      },
    });
  });

  test('should build a complete Elasticsearch query object with filter, search, order, and pagination', () => {
    const result = buildQueryArgsToElasticsearchQuery({
      filter: { key: 'name', operator: Operator.eq, values: ['John'] },
      search: { key: 'name', value: 'John' },
      order: { key: 'age', value: OrderingMode.ASC },
      offset: 10,
      limit: 20,
      isHighlight: true,
    });

    expect(result).toEqual({
      query: {
        bool: {
          must: [
            {
              bool: {
                must: [
                  {
                    bool: {
                      must: [
                        { bool: { should: [{ term: { name: 'John' } }] } },
                      ],
                      should: [],
                    },
                  },
                ],
              },
            },
            { bool: { must: {} } },
          ],
        },
      },
      from: 10,
      size: 20,
      sort: [{ age: 'asc' }],
      highlight: { fields: { name: {} } },
    });
  });
});
