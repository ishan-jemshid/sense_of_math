
import numpy as np
import matplotlib.pyplot as plt

def g(x, n):
  y = np.log(1 + (x**(2**n)))
  return y

def f(x, K=100):
    y = 0
    for k in range(K):
        yk = g(x,k)
        y = y + yk
    return y

def fPlot(xRange):
    y = []
    for x in xRange:
        y.append(f(x))
    return y

def h(n):
    y = np.exp(f(1 - (1/n)))
    return y

if __name__ == '__main__':
    print("running serie.py")
    pass 
    """
    xRange = np.linspace(0, 0.5, 100)
    y = fPlot(xRange)
    plt.plot(xRange, y)
    plt.grid(True)
    plt.show()
    """
