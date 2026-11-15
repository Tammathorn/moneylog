import { formatThb } from "../money";

export function Money({ satang, flagNegative = false }: { satang: number; flagNegative?: boolean }) {
  const negative = flagNegative && satang < 0;
  return (
    <span className={negative ? "money negative" : "money"}>
      {formatThb(satang)}
      {negative && <span className="neg-label"> (negative)</span>}
    </span>
  );
}

export function Status({ children }: { children: string }) {
  return <p role="status" className="muted">{children}</p>;
}

export function ErrorAlert({ message }: { message: string | null }) {
  return message ? <div role="alert" className="alert">{message}</div> : null;
}
