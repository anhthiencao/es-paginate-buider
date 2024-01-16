# es-paginate-builder

[![npm version](https://badge.fury.io/js/es-paginate-builder.svg)](https://gitlab.apollo.local/internal-libraries/es-paginate-builder)

`es-paginate-builder` is a TypeScript library that helps you build Elasticsearch queries with pagination easily. It provides functions to construct Elasticsearch queries based on filter criteria, search terms, ordering, and pagination options.

## Installation

You can install `es-paginate-builder` via npm:

```bash
npm install git+https://gitlab.apollo.local/internal-libraries/es-paginate-builder.git
```

## Usage
Basic example 

```typescript
import {
  validate,
  validateOrReject,
  Contains,
  IsInt,
  Length,
  IsEmail,
  IsFQDN,
  IsDate,
  Min,
  Max,
} from 'es-paginate-builder';

const query = buildQueryArgsToElasticsearchQuery({
  filter: { key: 'name', operator: Operator.eq, values: ['John'] },
  search: { key: 'name', value: 'John' },
  order: { key: 'age', value: OrderingMode.ASC },
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
