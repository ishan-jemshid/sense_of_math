# Trig Identities

I've been struggling with trig functions for a while now
mainly cause of the formulas you just gotta by heart

Here I'm trying to see such functions as graphs/plots

`sin(2A) = ... ... ..`
`cos(2A) = ... ... ..`
`tan(3A) = ... ..`
`... ..`

I had plotted these graphs in desmos & python, and in a sense understood them

but:
`sin(A+B)`
`cos(A+B)`
`tan(cos(A)+sin(B))`
`.....`
these kind of things are hard to see, so here mainly i am gonna be making a 3D graph of axises A,B,and f(A,B)

and from these explore the possibilities trying to find pattern which I hope could be usefull.


## Update

got results wayy better than exepected
"**precise_single**" file gives really good looking graphs
(easier for understanding an equation)

"**simple_multiple**" file gives neat plane graphs, but multiple graphs can be overlapped on each other
(For comparing graphs)
(feels like it could be pretty usefull)



## simple one with python 

    import numpy as np
    import matplotlib.pyplot as plt

    #range for both angles A and B
    a = np.linspace(-6.28,6.28,120)
    b = np.linspace(-6.28,6.28, 120)
    A, B = np.meshgrid(a, b)

    #--Equations--#
    #f_AB = np.sin(A + B)
    #f_AB = np.cos(A + B)
    #f_AB = np.tan(A + B)
    #f_AB = np.sin(A)*np.sin(B)
    f_AB = np.sin(np.sqrt(A*A + B*B))


    #plotting the surfaces
    ax = plt.figure(figsize=(10, 8)).add_subplot(projection="3d")
    ax.plot_surface(A, B, f_AB) 

    ax.set_xlabel("A")
    ax.set_ylabel("B")
    ax.set_zlabel("f(A, B)")

    plt.show()

***This may/will run slow since matplotlib is not ment for 3d graphs***