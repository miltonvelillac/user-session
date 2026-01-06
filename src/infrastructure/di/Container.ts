export type Factory<T> = (container: Container) => T;

type Registration<T> = {
  factory: Factory<T>;
  singleton: boolean;
};

export class Container {
  private readonly registrations = new Map<string, Registration<unknown>>();
  private readonly singletons = new Map<string, unknown>();

  register<T>(token: string, factory: Factory<T>, singleton: boolean = true): void {
    this.registrations.set(token, { factory, singleton });
  }

  resolve<T>(token: string): T {
    const registration = this.registrations.get(token);
    if (!registration) {
      throw new Error(`Dependency not registered: ${token}`);
    }

    if (registration.singleton) {
      if (!this.singletons.has(token)) {
        this.singletons.set(token, registration.factory(this));
      }
      return this.singletons.get(token) as T;
    }

    return registration.factory(this) as T;
  }
}