
# es-paginate-builder

[![npm version](https://badge.fury.io/js/es-paginate-builder.svg)](https://gitlab.apollo.local/internal-libraries/es-paginate-builder)

`es-paginate-builder` is a TypeScript library that helps you build Elasticsearch queries with pagination easily. It provides functions to construct Elasticsearch queries based on filter criteria, search terms, ordering, and pagination options.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
  - [Basic Example](#basic-example)
  - [Return Value](#return-value)
- [Builder Services](#builder-services)
  - [`buildQueryArgsToElasticsearchQuery(args)`](#buildqueryargstoelasticsearchqueryargs)
  - [`convertFilteringElasticsearchQuery(filter)`](#convertfilteringelasticsearchqueryfilter)
  - [`convertSingleFilter(filter)`](#convertsinglefilterfilter)
  - [`convertSearchingToElasticsearchQuery(searchInput, isHighlight)`](#convertsearchingtoelasticsearchquerysearchinput-ishighlight)
  - [`convertOrderingToElasticsearchQuery(orderInput)`](#convertorderingtoelasticsearchqueryorderinput)
- [Table of Contents](#table-of-contents)

## Installation

You can install `es-paginate-builder` via npm:

```bash
npm install git+https://gitlab.apollo.local/internal-libraries/es-paginate-builder.git
```

## Usage
Basic example 

```typescript
import {
  buildQueryArgsToElasticsearchQuery
} from 'es-paginate-builder';

const query = buildQueryArgsToElasticsearchQuery({
  filters: { key: 'name', operator: Operator.eq, values: ['John'] },
  searches: { key: 'name', value: 'John' },
  orders: { key: 'age', value: OrderingMode.ASC },
  offset: 10,
  limit: 20,
  isHighlight: true,
});
```

### Return value
```javascript
{
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
}
```

## Builder Services

### `buildQueryArgsToElasticsearchQuery(args)`

Builds a complete Elasticsearch query object based on the provided arguments.

- `args`: An object containing the arguments for building the query.

  - `filter?`: A single filter or an array of filters to convert. Filters are objects representing filter conditions for Elasticsearch queries.

    - `key`: The key to filter on.

    - `values`: An array of values to filter.

    - `operator`: The operator for the filter. Options include `eq` (equals), `neq` (not equals), `like` (substring match), `gt` (greater than), `gte` (greater than or equal to), `lt` (less than), `lte` (less than or equal to), `exists` (field exists). Default is `eq`

    - `or`(optional): An array of filter objects to be combined with the OR operator.

    - `and`(optional): An array of filter objects to be combined with the AND operator.

  - `search?`: A single search input or an array of search inputs to convert. Search inputs are objects representing search conditions for Elasticsearch queries.

    - `key`: The key to search on.

    - `value`: The value to search for.

    - `options`(optional): An optional array of search options.

  - `order?`: A single ordering input or an array of ordering inputs to convert. Ordering inputs are objects representing sorting conditions for Elasticsearch queries.

    - `key`: The key to sort on.

    - `value`: The sorting order, either `asc` (ascending) or `desc` (descending). Default is `asc`

  - `offset?`: The offset for pagination.

  - `limit?`: The limit for pagination.

  - `isHighlight?`: Whether to include highlighting in the query.

### `convertSingleFilter(filter)`

Converts a single filter to an Elasticsearch query object.

- `filter`: The filter to convert.

### `convertSearchingToElasticsearchQuery(searchInput, isHighlight)`

Converts a single search input or an array of search inputs to an Elasticsearch query object.

- `searchInput`: The search input(s) to convert.
- `isHighlight`: Whether to include highlighting in the query (default: false).

Returns an object containing the Elasticsearch query and highlight objects.

### `convertOrderingToElasticsearchQuery(orderInput)`

Converts a single ordering input or an array of ordering inputs to an Elasticsearch query object.

- `orderInput`: The ordering input(s) to convert.

