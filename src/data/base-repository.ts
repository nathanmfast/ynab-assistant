import * as DataStore from 'nedb'

export class BaseRepository<T> {
    _collection: DataStore<T>

    constructor (collectionName: string) {
      this._collection = new DataStore<T>({ filename: './data/' + collectionName + '-data', autoload: true })
    }

    get collection (): DataStore<T> {
      return this._collection
    }

    Compact (): void {
      this._collection.persistence.compactDatafile()
    }
}
