export default abstract class Configurable<T> {
  protected _config: T = {} as T;

  get config(): T {
    return this._config;
  }

  set config(config: Partial<T>) {
    this._config = { ...this._config, ...config };
  }

  constructor(config: T = {} as T) {
    this.config = { ...this._config, ...config };
  }

  get configType() {
    return typeof this._config;
  }
}
