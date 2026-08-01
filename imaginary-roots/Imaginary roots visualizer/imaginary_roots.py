import numpy as np
import matplotlib.pyplot as plt

#unlike the 3d visual graph, the will be a ditachment in the vertex of both since i am ploting the imaginary plane in the real plane
#coefficients
a = 1/2
b = -5
c = 15

x = np.linspace(-10,10,201)
yreal = a*(x**2) + b*x + c      #plotting real number graph

xv = -b / (2 * a)       # vertex of the real graph
yimg = a * (xv**2 - x**2) + b * xv + c #xv makes it so that roots are purly imaginary, derived from [a*xv^2 - a*x^2 + b*xv + c] + i[2a*xv*x + b*x]


#ploting the graph
plt.plot(x, yreal, color="red", label="Real")
plt.plot(x, yimg, color="blue", label="Imaginary")
plt.title("plotting imaginary roots")
plt.ylabel("f(x)")
plt.grid(True)
plt.show()