import { Server } from "@ns";

type Required<T> = {
  [P in keyof T]-?: T[P];
};

export type IndexableServer = Required<Server> & Record<string, any>;

export type ThreadsObjectType = {
  weaken: number;
  grow: number;
  hack: number;
};

export type RamCostsType = ThreadsObjectType & {
  total: number;
};

export type PartitionType = {
  name: string; // should be a unique identifier, preferrably with a uuid
  ramReserved: number;
};

export type Constructor<T = any> = new (...args: any[]) => T;

export type AnyFunction<A = any> = (...input: any[]) => A;
export type AnyConstructor<A = object> = new (...input: any[]) => A;

export type Mixin<T extends AnyFunction> = InstanceType<ReturnType<T>>;
