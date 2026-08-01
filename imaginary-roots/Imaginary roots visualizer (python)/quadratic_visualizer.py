"""
Quadratic root visualizer (matplotlib only).

Enter a, b, c for f(x) = ax^2 + bx + c. Plots the real curve alongside the
imaginary slice through the vertex (f(vertex + iz) as z varies), and marks
the roots on whichever curve they actually live on.

Run:
    pip install matplotlib numpy
    python3 quadratic_visualizer.py
"""

import numpy as np
import matplotlib.pyplot as plt


def get_float(prompt, default):
    while True:
        raw = input(f"{prompt} [{default}]: ").strip()
        if raw == "":
            return default
        try:
            return float(raw)
        except ValueError:
            print("Please enter a number.")


def format_equation(a, b, c):
    eq = "f(x) = "
    eq += "x²" if a == 1 else ("-x²" if a == -1 else f"{a:g}x²")
    if b > 0:
        eq += f" + {b:g}x"
    elif b < 0:
        eq += f" - {abs(b):g}x"
    if c > 0:
        eq += f" + {c:g}"
    elif c < 0:
        eq += f" - {abs(c):g}"
    return eq


def main():
    print("Quadratic Root Visualizer -- f(x) = ax^2 + bx + c\n")
    a = get_float("Coefficient a", 1.0)
    if abs(a) < 1e-6:
        a = 0.01
    b = get_float("Coefficient b", 0.0)
    c = get_float("Constant c", 1.0)

    xv = -b / (2 * a)  # vertex x position
    discriminant = b * b - 4 * a * c

    span = max(5.0, abs(xv) + 5.0)
    t = np.linspace(-span, span, 400)

    real_y = a * t**2 + b * t + c  # f(x), imaginary part z = 0
    imag_y = a * (xv**2 - t**2) + b * xv + c  # f(xv + iz), slice through vertex

    fig, ax = plt.subplots(figsize=(9, 6))
    ax.axhline(0, color="#9ca3af", linewidth=1)
    ax.axvline(0, color="#9ca3af", linewidth=1)
    ax.plot(t, real_y, color="#ef4444", linewidth=2, label="Real curve: f(x), x real")
    ax.plot(t, imag_y, color="#3b82f6", linewidth=2, linestyle="--",
            label="Imaginary slice: f(vertex + iz)")

    if discriminant >= 0:
        r1 = (-b + np.sqrt(discriminant)) / (2 * a)
        r2 = (-b - np.sqrt(discriminant)) / (2 * a)
        ax.plot([r1, r2], [0, 0], "o", color="#10b981", markersize=10,
                label="Roots (real)", zorder=5)
        roots_text = f"x1 = {r1:.3f}, x2 = {r2:.3f}"
    else:
        z_val = np.sqrt(-discriminant) / (2 * a)
        ax.plot([z_val, -z_val], [0, 0], "o", color="#10b981", markersize=10,
                label="Roots (on imaginary slice)", zorder=5)
        roots_text = f"x = {xv:.3f} +/- {z_val:.3f}i"

    ax.set_title(f"{format_equation(a, b, c)}\nRoots: {roots_text}")
    ax.set_xlabel("Real input (x)  /  Imaginary input (z)")
    ax.set_ylabel("f(x)")
    ax.legend(loc="upper right")
    ax.grid(True, linewidth=0.5)
    fig.tight_layout()
    plt.show()


if __name__ == "__main__":
    main()
